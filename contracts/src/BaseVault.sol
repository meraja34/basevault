// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract BaseVault {

    struct FileRecord {
        uint256 id;
        address uploader;
        bytes32 fileHash;      // SHA256 hash of original file (before encryption)
        string fileName;
        string fileType;       // mime type
        uint256 fileSize;      // bytes (original size)
        uint256 uploadedAt;
        bool certified;
        uint256 chunkCount;    // number of data chunks
        bool isPublic;         // false = encrypted/private, true = public
    }

    struct Certification {
        uint256 fileId;
        address certifiedBy;
        bytes32 fileHash;
        uint256 certifiedAt;
        string fileName;
    }

    uint256 public fileCount;
    uint256 public certificationCount;
    uint256 public certificationFee;
    address public owner;

    // fileId => FileRecord
    mapping(uint256 => FileRecord) public files;

    // fileId => chunkIndex => data (on-chain storage)
    mapping(uint256 => mapping(uint256 => bytes)) public fileData;

    // hash => fileId
    mapping(bytes32 => uint256) public hashToFileId;

    // user => fileIds
    mapping(address => uint256[]) public userFiles;

    // certificationId => Certification
    mapping(uint256 => Certification) public certifications;

    // user => certificationIds
    mapping(address => uint256[]) public userCertifications;

    event FileDataStored(
        uint256 indexed id,
        uint256 indexed chunkIndex,
        bytes data
    );

    event FileUploaded(
        uint256 indexed id,
        address indexed uploader,
        bytes32 fileHash,
        string fileName,
        string fileType,
        uint256 fileSize,
        bool isPublic
    );

    event FileVisibilityChanged(
        uint256 indexed id,
        bool isPublic
    );

    event FileCertified(
        uint256 indexed fileId,
        uint256 indexed certId,
        address indexed certifiedBy,
        bytes32 fileHash
    );

    event CertificationFeeUpdated(uint256 newFee);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(uint256 _certificationFee) {
        owner = msg.sender;
        certificationFee = _certificationFee;
    }

    /// @notice Create file record
    function createFile(
        bytes32 _fileHash,
        string calldata _fileName,
        string calldata _fileType,
        uint256 _fileSize,
        uint256 _chunkCount,
        bool _isPublic
    ) external returns (uint256) {
        require(_fileHash != bytes32(0), "Hash required");
        require(bytes(_fileName).length > 0, "Filename required");
        require(_chunkCount > 0, "Chunks required");

        fileCount++;
        files[fileCount] = FileRecord({
            id: fileCount,
            uploader: msg.sender,
            fileHash: _fileHash,
            fileName: _fileName,
            fileType: _fileType,
            fileSize: _fileSize,
            uploadedAt: block.timestamp,
            certified: false,
            chunkCount: _chunkCount,
            isPublic: _isPublic
        });

        hashToFileId[_fileHash] = fileCount;
        userFiles[msg.sender].push(fileCount);

        emit FileUploaded(fileCount, msg.sender, _fileHash, _fileName, _fileType, _fileSize, _isPublic);
        return fileCount;
    }

    /// @notice Create file and upload all data in one transaction
    function createFileWithData(
        bytes32 _fileHash,
        string calldata _fileName,
        string calldata _fileType,
        uint256 _fileSize,
        bool _isPublic,
        bytes[] calldata _chunks
    ) external returns (uint256) {
        require(_fileHash != bytes32(0), "Hash required");
        require(bytes(_fileName).length > 0, "Filename required");
        require(_chunks.length > 0, "Chunks required");

        fileCount++;
        files[fileCount] = FileRecord({
            id: fileCount,
            uploader: msg.sender,
            fileHash: _fileHash,
            fileName: _fileName,
            fileType: _fileType,
            fileSize: _fileSize,
            uploadedAt: block.timestamp,
            certified: false,
            chunkCount: _chunks.length,
            isPublic: _isPublic
        });

        hashToFileId[_fileHash] = fileCount;
        userFiles[msg.sender].push(fileCount);

        for (uint256 i = 0; i < _chunks.length; i++) {
            fileData[fileCount][i] = _chunks[i];
        }

        emit FileUploaded(fileCount, msg.sender, _fileHash, _fileName, _fileType, _fileSize, _isPublic);
        return fileCount;
    }

    /// @notice Upload file data chunk - stored on-chain
    function uploadChunk(
        uint256 _fileId,
        uint256 _chunkIndex,
        bytes calldata _data
    ) external {
        require(_fileId > 0 && _fileId <= fileCount, "Invalid file");
        require(files[_fileId].uploader == msg.sender, "Not uploader");
        require(_chunkIndex < files[_fileId].chunkCount, "Invalid chunk");

        fileData[_fileId][_chunkIndex] = _data;

        emit FileDataStored(_fileId, _chunkIndex, _data);
    }

    /// @notice Read a chunk of file data
    function getChunk(uint256 _fileId, uint256 _chunkIndex) external view returns (bytes memory) {
        return fileData[_fileId][_chunkIndex];
    }

    /// @notice Toggle file visibility (only uploader)
    function setFileVisibility(uint256 _fileId, bool _isPublic) external {
        require(_fileId > 0 && _fileId <= fileCount, "Invalid file");
        require(files[_fileId].uploader == msg.sender, "Not uploader");

        files[_fileId].isPublic = _isPublic;

        emit FileVisibilityChanged(_fileId, _isPublic);
    }

    /// @notice Certify a document (paid)
    function certifyDocument(uint256 _fileId) external payable {
        require(_fileId > 0 && _fileId <= fileCount, "Invalid file");
        require(files[_fileId].uploader == msg.sender, "Not uploader");
        require(!files[_fileId].certified, "Already certified");
        require(msg.value >= certificationFee, "Insufficient fee");

        files[_fileId].certified = true;

        certificationCount++;
        certifications[certificationCount] = Certification({
            fileId: _fileId,
            certifiedBy: msg.sender,
            fileHash: files[_fileId].fileHash,
            certifiedAt: block.timestamp,
            fileName: files[_fileId].fileName
        });

        userCertifications[msg.sender].push(certificationCount);

        emit FileCertified(_fileId, certificationCount, msg.sender, files[_fileId].fileHash);

        if (msg.value > certificationFee) {
            (bool ok, ) = payable(msg.sender).call{value: msg.value - certificationFee}("");
            require(ok, "Refund failed");
        }
    }

    /// @notice Verify document by hash
    function verifyDocument(bytes32 _fileHash) external view returns (
        bool exists,
        uint256 fileId,
        address uploader,
        uint256 uploadedAt,
        bool certified,
        string memory fileName
    ) {
        uint256 id = hashToFileId[_fileHash];
        if (id == 0) {
            return (false, 0, address(0), 0, false, "");
        }
        FileRecord memory f = files[id];
        return (true, f.id, f.uploader, f.uploadedAt, f.certified, f.fileName);
    }

    /// @notice Get file record
    function getFile(uint256 _id) external view returns (FileRecord memory) {
        require(_id > 0 && _id <= fileCount, "Invalid file");
        return files[_id];
    }

    /// @notice Get user file ids
    function getUserFileIds(address _user) external view returns (uint256[] memory) {
        return userFiles[_user];
    }

    /// @notice Get user certification ids
    function getUserCertificationIds(address _user) external view returns (uint256[] memory) {
        return userCertifications[_user];
    }

    /// @notice Get files paginated
    function getFiles(uint256 _offset, uint256 _limit)
        external view returns (FileRecord[] memory)
    {
        uint256 end = _offset + _limit;
        if (end > fileCount) end = fileCount;
        uint256 len = end > _offset ? end - _offset : 0;

        FileRecord[] memory result = new FileRecord[](len);
        for (uint256 i = 0; i < len; i++) {
            result[i] = files[_offset + i + 1];
        }
        return result;
    }

    /// @notice Update certification fee
    function setCertificationFee(uint256 _newFee) external onlyOwner {
        certificationFee = _newFee;
        emit CertificationFeeUpdated(_newFee);
    }

    /// @notice Withdraw fees
    function withdraw() external onlyOwner {
        (bool ok, ) = payable(owner).call{value: address(this).balance}("");
        require(ok, "Withdraw failed");
    }
}
