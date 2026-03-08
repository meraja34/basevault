// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract BaseVault {

    struct FileRecord {
        uint256 id;
        address uploader;
        bytes32 fileHash;
        string fileName;
        string fileType;
        uint256 fileSize;
        uint256 uploadedAt;
        bool certified;
        uint256 chunkCount;
        bool isPublic;
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
    uint256 public feePerChunk;
    address public owner;

    mapping(uint256 => FileRecord) public files;
    mapping(uint256 => mapping(uint256 => bytes)) public fileData;
    mapping(bytes32 => uint256) public hashToFileId;
    mapping(address => uint256[]) public userFiles;
    mapping(uint256 => Certification) public certifications;
    mapping(address => uint256[]) public userCertifications;

    event FileUploaded(
        uint256 indexed id,
        address indexed uploader,
        bytes32 fileHash,
        string fileName,
        string fileType,
        uint256 fileSize,
        bool isPublic
    );

    event FileVisibilityChanged(uint256 indexed id, bool isPublic);

    event FileCertified(
        uint256 indexed fileId,
        uint256 indexed certId,
        address indexed certifiedBy,
        bytes32 fileHash
    );

    event CertificationFeeUpdated(uint256 newFee);
    event ChunkFeeUpdated(uint256 newFee);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(uint256 _certificationFee, uint256 _feePerChunk) {
        owner = msg.sender;
        certificationFee = _certificationFee;
        feePerChunk = _feePerChunk;
    }

    /// @notice Create file record (fee = feePerChunk * chunkCount)
    function createFile(
        bytes32 _fileHash,
        string calldata _fileName,
        string calldata _fileType,
        uint256 _fileSize,
        uint256 _chunkCount,
        bool _isPublic
    ) external payable returns (uint256) {
        uint256 totalFee = feePerChunk * _chunkCount;
        require(_fileHash != bytes32(0), "Hash required");
        require(bytes(_fileName).length > 0, "Filename required");
        require(_chunkCount > 0, "Chunks required");
        require(msg.value >= totalFee, "Insufficient fee");

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

        if (msg.value > totalFee) {
            (bool ok, ) = payable(msg.sender).call{value: msg.value - totalFee}("");
            require(ok, "Refund failed");
        }
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
    ) external payable returns (uint256) {
        uint256 totalFee = feePerChunk * _chunks.length;
        require(_fileHash != bytes32(0), "Hash required");
        require(bytes(_fileName).length > 0, "Filename required");
        require(_chunks.length > 0, "Chunks required");
        require(msg.value >= totalFee, "Insufficient fee");

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

        if (msg.value > totalFee) {
            (bool ok, ) = payable(msg.sender).call{value: msg.value - totalFee}("");
            require(ok, "Refund failed");
        }
        return fileCount;
    }

    /// @notice Upload file data chunk (free - fee paid on createFile)
    function uploadChunk(uint256 _fileId, uint256 _chunkIndex, bytes calldata _data) external {
        require(_fileId > 0 && _fileId <= fileCount, "Invalid file");
        require(files[_fileId].uploader == msg.sender, "Not uploader");
        require(_chunkIndex < files[_fileId].chunkCount, "Invalid chunk");
        fileData[_fileId][_chunkIndex] = _data;
    }

    function getChunk(uint256 _fileId, uint256 _chunkIndex) external view returns (bytes memory) {
        return fileData[_fileId][_chunkIndex];
    }

    function setFileVisibility(uint256 _fileId, bool _isPublic) external {
        require(_fileId > 0 && _fileId <= fileCount, "Invalid file");
        require(files[_fileId].uploader == msg.sender, "Not uploader");
        files[_fileId].isPublic = _isPublic;
        emit FileVisibilityChanged(_fileId, _isPublic);
    }

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

    function verifyDocument(bytes32 _fileHash) external view returns (
        bool exists, uint256 fileId, address uploader, uint256 uploadedAt, bool certified, string memory fileName
    ) {
        uint256 id = hashToFileId[_fileHash];
        if (id == 0) return (false, 0, address(0), 0, false, "");
        FileRecord memory f = files[id];
        return (true, f.id, f.uploader, f.uploadedAt, f.certified, f.fileName);
    }

    function getFile(uint256 _id) external view returns (FileRecord memory) {
        require(_id > 0 && _id <= fileCount, "Invalid file");
        return files[_id];
    }

    function getUserFileIds(address _user) external view returns (uint256[] memory) {
        return userFiles[_user];
    }

    function getUserCertificationIds(address _user) external view returns (uint256[] memory) {
        return userCertifications[_user];
    }

    function getFiles(uint256 _offset, uint256 _limit) external view returns (FileRecord[] memory) {
        uint256 end = _offset + _limit;
        if (end > fileCount) end = fileCount;
        uint256 len = end > _offset ? end - _offset : 0;
        FileRecord[] memory result = new FileRecord[](len);
        for (uint256 i = 0; i < len; i++) {
            result[i] = files[_offset + i + 1];
        }
        return result;
    }

    function setCertificationFee(uint256 _newFee) external onlyOwner {
        certificationFee = _newFee;
        emit CertificationFeeUpdated(_newFee);
    }

    function setFeePerChunk(uint256 _newFee) external onlyOwner {
        feePerChunk = _newFee;
        emit ChunkFeeUpdated(_newFee);
    }

    function withdraw() external onlyOwner {
        (bool ok, ) = payable(owner).call{value: address(this).balance}("");
        require(ok, "Withdraw failed");
    }
}
