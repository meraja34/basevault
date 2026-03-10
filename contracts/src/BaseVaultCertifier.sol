// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./IBaseVault.sol";

contract BaseVaultCertifier {

    enum InstitutionStatus { PENDING, ACTIVE, SUSPENDED }

    enum CertType {
        GENERIC,
        DEGREE,
        TRANSCRIPT,
        COURSE_COMPLETION,
        BADGE,
        LICENSE,
        CONTRACT_CERT,
        NDA,
        AUDIT,
        IP_PROOF,
        MEDICAL_RECORD,
        LAB_REPORT,
        RESEARCH_PAPER
    }

    struct Institution {
        address admin;
        InstitutionStatus status;
        string name;
        string metadataURI;
        uint16 certTypesMask;
        uint256 certCount;
    }

    struct InstitutionalCert {
        uint256 fileId;
        uint256 institutionId;
        bytes32 fileHash;
        address recipient;
        CertType certType;
        uint64 issuedAt;
        uint64 expiresAt;
        bool revoked;
        string recipientName;
        string metadata;
    }

    struct RevocationRecord {
        uint256 certId;
        uint64 revokedAt;
        string reason;
    }

    IBaseVault public immutable baseVault;
    address public owner;

    uint256 public institutionCount;
    uint256 public certCount;

    uint256 public institutionRegistrationFee;
    uint256 public perCertFee;
    uint256 public batchDiscountBps;

    mapping(uint256 => Institution) public institutions;
    mapping(uint256 => InstitutionalCert) public certs;
    mapping(uint256 => RevocationRecord) public revocations;

    mapping(uint256 => mapping(address => bool)) public delegates;

    mapping(bytes32 => uint256[]) internal _hashCerts;
    mapping(address => uint256[]) internal _recipientCerts;
    mapping(uint256 => uint256[]) internal _institutionCerts;

    event InstitutionRegistered(uint256 indexed instId, address indexed admin, string name);
    event InstitutionStatusChanged(uint256 indexed instId, InstitutionStatus status);
    event DelegateChanged(uint256 indexed instId, address indexed delegate, bool authorized);
    event CertIssued(
        uint256 indexed certId, uint256 indexed instId,
        bytes32 fileHash, address indexed recipient, CertType certType
    );
    event CertRevoked(uint256 indexed certId, string reason);
    event FeesUpdated(uint256 registrationFee, uint256 perCertFee, uint256 batchDiscountBps);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyInstitutionAuth(uint256 _instId) {
        require(_instId > 0 && _instId <= institutionCount, "Invalid institution");
        Institution storage inst = institutions[_instId];
        require(msg.sender == inst.admin || delegates[_instId][msg.sender], "Not authorized");
        require(inst.status == InstitutionStatus.ACTIVE, "Institution not active");
        _;
    }

    constructor(
        address _baseVault,
        uint256 _registrationFee,
        uint256 _perCertFee,
        uint256 _batchDiscountBps
    ) {
        baseVault = IBaseVault(_baseVault);
        owner = msg.sender;
        institutionRegistrationFee = _registrationFee;
        perCertFee = _perCertFee;
        batchDiscountBps = _batchDiscountBps;
    }

    /// @notice Register as an institution
    function registerInstitution(
        string calldata _name,
        string calldata _metadataURI,
        uint16 _certTypesMask
    ) external payable returns (uint256) {
        require(msg.value >= institutionRegistrationFee, "Insufficient fee");
        require(bytes(_name).length > 0, "Name required");
        require(_certTypesMask > 0, "At least one cert type");

        institutionCount++;
        institutions[institutionCount] = Institution({
            admin: msg.sender,
            status: InstitutionStatus.ACTIVE,
            name: _name,
            metadataURI: _metadataURI,
            certTypesMask: _certTypesMask,
            certCount: 0
        });

        emit InstitutionRegistered(institutionCount, msg.sender, _name);

        if (msg.value > institutionRegistrationFee) {
            (bool ok, ) = payable(msg.sender).call{value: msg.value - institutionRegistrationFee}("");
            require(ok, "Refund failed");
        }

        return institutionCount;
    }

    /// @notice Certify a file that exists on BaseVault
    function certify(
        uint256 _instId,
        uint256 _fileId,
        address _recipient,
        CertType _certType,
        uint64 _expiresAt,
        string calldata _recipientName,
        string calldata _metadata
    ) external payable onlyInstitutionAuth(_instId) returns (uint256) {
        require(msg.value >= perCertFee, "Insufficient fee");
        require(_isTypeAllowed(institutions[_instId].certTypesMask, _certType), "Cert type not allowed");

        IBaseVault.FileRecord memory f = baseVault.getFile(_fileId);
        require(f.id > 0, "File not found");

        return _issueCert(_instId, _fileId, f.fileHash, _recipient, _certType, _expiresAt, _recipientName, _metadata, perCertFee);
    }

    /// @notice Certify by hash (file doesn't need to be on BaseVault)
    function certifyByHash(
        uint256 _instId,
        bytes32 _fileHash,
        address _recipient,
        CertType _certType,
        uint64 _expiresAt,
        string calldata _recipientName,
        string calldata _metadata
    ) external payable onlyInstitutionAuth(_instId) returns (uint256) {
        require(msg.value >= perCertFee, "Insufficient fee");
        require(_fileHash != bytes32(0), "Hash required");
        require(_isTypeAllowed(institutions[_instId].certTypesMask, _certType), "Cert type not allowed");

        uint256 fileId = baseVault.hashToFileId(_fileHash);
        return _issueCert(_instId, fileId, _fileHash, _recipient, _certType, _expiresAt, _recipientName, _metadata, perCertFee);
    }

    /// @notice Batch certify up to 100 files
    function batchCertify(
        uint256 _instId,
        uint256[] calldata _fileIds,
        address[] calldata _recipients,
        CertType _certType,
        uint64 _expiresAt,
        string[] calldata _recipientNames,
        string calldata _metadata
    ) external payable onlyInstitutionAuth(_instId) returns (uint256[] memory) {
        uint256 count = _fileIds.length;
        require(count > 0 && count <= 100, "Batch 1-100");
        require(count == _recipients.length && count == _recipientNames.length, "Array mismatch");
        require(_isTypeAllowed(institutions[_instId].certTypesMask, _certType), "Cert type not allowed");

        uint256 totalFee = (perCertFee * count * (10000 - batchDiscountBps)) / 10000;
        require(msg.value >= totalFee, "Insufficient fee");

        uint256[] memory certIds = new uint256[](count);

        for (uint256 i = 0; i < count;) {
            IBaseVault.FileRecord memory f = baseVault.getFile(_fileIds[i]);
            require(f.id > 0, "File not found");

            certCount++;
            certs[certCount] = InstitutionalCert({
                fileId: _fileIds[i],
                institutionId: _instId,
                fileHash: f.fileHash,
                recipient: _recipients[i],
                certType: _certType,
                issuedAt: uint64(block.timestamp),
                expiresAt: _expiresAt,
                revoked: false,
                recipientName: _recipientNames[i],
                metadata: _metadata
            });

            _hashCerts[f.fileHash].push(certCount);
            _recipientCerts[_recipients[i]].push(certCount);
            _institutionCerts[_instId].push(certCount);
            certIds[i] = certCount;

            emit CertIssued(certCount, _instId, f.fileHash, _recipients[i], _certType);

            unchecked { i++; }
        }

        institutions[_instId].certCount += count;

        if (msg.value > totalFee) {
            (bool ok, ) = payable(msg.sender).call{value: msg.value - totalFee}("");
            require(ok, "Refund failed");
        }

        return certIds;
    }

    /// @notice Revoke a certification
    function revokeCert(uint256 _certId, string calldata _reason) external {
        require(_certId > 0 && _certId <= certCount, "Invalid cert");
        InstitutionalCert storage cert = certs[_certId];
        require(!cert.revoked, "Already revoked");

        uint256 instId = cert.institutionId;
        require(
            msg.sender == institutions[instId].admin || delegates[instId][msg.sender],
            "Not authorized"
        );

        cert.revoked = true;
        revocations[_certId] = RevocationRecord({
            certId: _certId,
            revokedAt: uint64(block.timestamp),
            reason: _reason
        });

        emit CertRevoked(_certId, _reason);
    }

    /// @notice Add or remove a delegate for an institution
    function setDelegate(uint256 _instId, address _delegate, bool _authorized) external {
        require(_instId > 0 && _instId <= institutionCount, "Invalid institution");
        require(msg.sender == institutions[_instId].admin, "Not admin");

        delegates[_instId][_delegate] = _authorized;
        emit DelegateChanged(_instId, _delegate, _authorized);
    }

    // ========== View Functions ==========

    /// @notice Get all institutional certifications for a file hash
    function verifyCertifications(bytes32 _fileHash) external view returns (InstitutionalCert[] memory) {
        uint256[] storage ids = _hashCerts[_fileHash];
        InstitutionalCert[] memory result = new InstitutionalCert[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = certs[ids[i]];
        }
        return result;
    }

    /// @notice Check if a cert is currently valid
    function isCertValid(uint256 _certId) external view returns (bool) {
        if (_certId == 0 || _certId > certCount) return false;
        InstitutionalCert storage cert = certs[_certId];
        if (cert.revoked) return false;
        if (cert.expiresAt > 0 && block.timestamp > cert.expiresAt) return false;
        if (institutions[cert.institutionId].status != InstitutionStatus.ACTIVE) return false;
        return true;
    }

    function getCert(uint256 _certId) external view returns (InstitutionalCert memory) {
        require(_certId > 0 && _certId <= certCount, "Invalid cert");
        return certs[_certId];
    }

    function getInstitution(uint256 _instId) external view returns (Institution memory) {
        require(_instId > 0 && _instId <= institutionCount, "Invalid institution");
        return institutions[_instId];
    }

    function getRecipientCerts(address _recipient) external view returns (uint256[] memory) {
        return _recipientCerts[_recipient];
    }

    function getInstitutionCerts(uint256 _instId) external view returns (uint256[] memory) {
        return _institutionCerts[_instId];
    }

    function getHashCertIds(bytes32 _fileHash) external view returns (uint256[] memory) {
        return _hashCerts[_fileHash];
    }

    // ========== Owner Functions ==========

    function setInstitutionStatus(uint256 _instId, InstitutionStatus _status) external onlyOwner {
        require(_instId > 0 && _instId <= institutionCount, "Invalid institution");
        institutions[_instId].status = _status;
        emit InstitutionStatusChanged(_instId, _status);
    }

    function setFees(uint256 _registrationFee, uint256 _perCertFee, uint256 _batchDiscountBps) external onlyOwner {
        require(_batchDiscountBps <= 5000, "Max 50% discount");
        institutionRegistrationFee = _registrationFee;
        perCertFee = _perCertFee;
        batchDiscountBps = _batchDiscountBps;
        emit FeesUpdated(_registrationFee, _perCertFee, _batchDiscountBps);
    }

    function withdraw() external onlyOwner {
        (bool ok, ) = payable(owner).call{value: address(this).balance}("");
        require(ok, "Withdraw failed");
    }

    // ========== Internal ==========

    function _issueCert(
        uint256 _instId,
        uint256 _fileId,
        bytes32 _fileHash,
        address _recipient,
        CertType _certType,
        uint64 _expiresAt,
        string calldata _recipientName,
        string calldata _metadata,
        uint256 _fee
    ) internal returns (uint256) {
        certCount++;
        certs[certCount] = InstitutionalCert({
            fileId: _fileId,
            institutionId: _instId,
            fileHash: _fileHash,
            recipient: _recipient,
            certType: _certType,
            issuedAt: uint64(block.timestamp),
            expiresAt: _expiresAt,
            revoked: false,
            recipientName: _recipientName,
            metadata: _metadata
        });

        _hashCerts[_fileHash].push(certCount);
        _recipientCerts[_recipient].push(certCount);
        _institutionCerts[_instId].push(certCount);
        institutions[_instId].certCount++;

        emit CertIssued(certCount, _instId, _fileHash, _recipient, _certType);

        if (msg.value > _fee) {
            (bool ok, ) = payable(msg.sender).call{value: msg.value - _fee}("");
            require(ok, "Refund failed");
        }

        return certCount;
    }

    function _isTypeAllowed(uint16 _mask, CertType _certType) internal pure returns (bool) {
        return (_mask >> uint8(_certType)) & 1 == 1;
    }
}
