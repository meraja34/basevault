// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IBaseVault {
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

    function fileCount() external view returns (uint256);
    function getFile(uint256 _id) external view returns (FileRecord memory);
    function hashToFileId(bytes32 _hash) external view returns (uint256);
    function files(uint256) external view returns (
        uint256 id, address uploader, bytes32 fileHash,
        string memory fileName, string memory fileType,
        uint256 fileSize, uint256 uploadedAt, bool certified,
        uint256 chunkCount, bool isPublic
    );
}
