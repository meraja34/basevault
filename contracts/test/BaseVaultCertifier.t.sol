// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/BaseVault.sol";
import "../src/BaseVaultCertifier.sol";

contract BaseVaultCertifierTest is Test {
    BaseVault public vault;
    BaseVaultCertifier public certifier;

    address owner = address(this);
    address alice = address(0xA11CE);
    address bob = address(0xB0B);
    address charlie = address(0xC);
    address recipient1 = address(0x1111);
    address recipient2 = address(0x2222);

    uint256 constant REG_FEE = 0.01 ether;
    uint256 constant CERT_FEE = 0.0005 ether;
    uint256 constant BATCH_DISCOUNT = 1000; // 10%

    // CertType bitmasks
    uint16 constant MASK_DEGREE = 1 << 1;        // bit 1
    uint16 constant MASK_TRANSCRIPT = 1 << 2;     // bit 2
    uint16 constant MASK_COURSE = 1 << 3;         // bit 3
    uint16 constant MASK_LICENSE = 1 << 5;        // bit 5
    uint16 constant MASK_GENERIC = 1;             // bit 0
    uint16 constant MASK_ALL = 0x1FFF;            // all 13 types

    function setUp() public {
        vault = new BaseVault(0.001 ether, 0.0001 ether);
        certifier = new BaseVaultCertifier(
            address(vault),
            REG_FEE,
            CERT_FEE,
            BATCH_DISCOUNT
        );

        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
        vm.deal(charlie, 10 ether);

        // Upload a test file to vault
        vm.prank(alice);
        vault.createFile{value: 0.0001 ether}(
            bytes32(uint256(0x1234)),
            "degree.pdf",
            "application/pdf",
            1024,
            1,
            true
        );

        // Upload second test file
        vm.prank(alice);
        vault.createFile{value: 0.0001 ether}(
            bytes32(uint256(0x5678)),
            "transcript.pdf",
            "application/pdf",
            2048,
            1,
            true
        );

        // Upload third test file
        vm.prank(bob);
        vault.createFile{value: 0.0001 ether}(
            bytes32(uint256(0xABCD)),
            "contract.pdf",
            "application/pdf",
            512,
            1,
            true
        );
    }

    // ========== Institution Registration ==========

    function test_registerInstitution() public {
        vm.prank(alice);
        uint256 instId = certifier.registerInstitution{value: REG_FEE}(
            "MIT University",
            "https://mit.edu/meta.json",
            MASK_DEGREE | MASK_TRANSCRIPT
        );

        assertEq(instId, 1);
        assertEq(certifier.institutionCount(), 1);

        BaseVaultCertifier.Institution memory inst = certifier.getInstitution(1);
        assertEq(inst.admin, alice);
        assertEq(uint8(inst.status), uint8(BaseVaultCertifier.InstitutionStatus.ACTIVE));
        assertEq(inst.name, "MIT University");
        assertEq(inst.metadataURI, "https://mit.edu/meta.json");
        assertEq(inst.certTypesMask, MASK_DEGREE | MASK_TRANSCRIPT);
        assertEq(inst.certCount, 0);
    }

    function test_registerInstitution_refundsExcess() public {
        uint256 balBefore = alice.balance;
        vm.prank(alice);
        certifier.registerInstitution{value: 1 ether}(
            "MIT", "", MASK_DEGREE
        );
        uint256 balAfter = alice.balance;
        assertEq(balBefore - balAfter, REG_FEE);
    }

    function test_registerInstitution_revertInsufficientFee() public {
        vm.prank(alice);
        vm.expectRevert("Insufficient fee");
        certifier.registerInstitution{value: 0.001 ether}(
            "MIT", "", MASK_DEGREE
        );
    }

    function test_registerInstitution_revertEmptyName() public {
        vm.prank(alice);
        vm.expectRevert("Name required");
        certifier.registerInstitution{value: REG_FEE}("", "", MASK_DEGREE);
    }

    function test_registerInstitution_revertZeroMask() public {
        vm.prank(alice);
        vm.expectRevert("At least one cert type");
        certifier.registerInstitution{value: REG_FEE}("MIT", "", 0);
    }

    // ========== Delegation ==========

    function test_setDelegate() public {
        vm.prank(alice);
        certifier.registerInstitution{value: REG_FEE}("MIT", "", MASK_ALL);

        vm.prank(alice);
        certifier.setDelegate(1, bob, true);
        assertTrue(certifier.delegates(1, bob));

        vm.prank(alice);
        certifier.setDelegate(1, bob, false);
        assertFalse(certifier.delegates(1, bob));
    }

    function test_setDelegate_revertNotAdmin() public {
        vm.prank(alice);
        certifier.registerInstitution{value: REG_FEE}("MIT", "", MASK_ALL);

        vm.prank(bob);
        vm.expectRevert("Not admin");
        certifier.setDelegate(1, charlie, true);
    }

    // ========== Single Certification ==========

    function test_certify() public {
        vm.prank(alice);
        certifier.registerInstitution{value: REG_FEE}("MIT", "", MASK_DEGREE | MASK_TRANSCRIPT);

        vm.prank(alice);
        uint256 certId = certifier.certify{value: CERT_FEE}(
            1, // instId
            1, // fileId
            recipient1,
            BaseVaultCertifier.CertType.DEGREE,
            0, // no expiry
            "John Doe",
            '{"program":"CS","year":"2024"}'
        );

        assertEq(certId, 1);
        assertEq(certifier.certCount(), 1);

        BaseVaultCertifier.InstitutionalCert memory cert = certifier.getCert(1);
        assertEq(cert.fileId, 1);
        assertEq(cert.institutionId, 1);
        assertEq(cert.fileHash, bytes32(uint256(0x1234)));
        assertEq(cert.recipient, recipient1);
        assertEq(uint8(cert.certType), uint8(BaseVaultCertifier.CertType.DEGREE));
        assertEq(cert.recipientName, "John Doe");
        assertFalse(cert.revoked);

        // Check mappings
        uint256[] memory recipCerts = certifier.getRecipientCerts(recipient1);
        assertEq(recipCerts.length, 1);
        assertEq(recipCerts[0], 1);

        uint256[] memory instCerts = certifier.getInstitutionCerts(1);
        assertEq(instCerts.length, 1);

        // Check institution cert count
        BaseVaultCertifier.Institution memory inst = certifier.getInstitution(1);
        assertEq(inst.certCount, 1);
    }

    function test_certify_delegateCanCertify() public {
        vm.prank(alice);
        certifier.registerInstitution{value: REG_FEE}("MIT", "", MASK_ALL);

        vm.prank(alice);
        certifier.setDelegate(1, bob, true);

        vm.prank(bob);
        uint256 certId = certifier.certify{value: CERT_FEE}(
            1, 1, recipient1, BaseVaultCertifier.CertType.DEGREE, 0, "Jane", ""
        );
        assertEq(certId, 1);
    }

    function test_certify_revertTypeNotAllowed() public {
        vm.prank(alice);
        certifier.registerInstitution{value: REG_FEE}("MIT", "", MASK_DEGREE); // only degree

        vm.prank(alice);
        vm.expectRevert("Cert type not allowed");
        certifier.certify{value: CERT_FEE}(
            1, 1, recipient1, BaseVaultCertifier.CertType.TRANSCRIPT, 0, "John", ""
        );
    }

    function test_certify_revertNotAuthorized() public {
        vm.prank(alice);
        certifier.registerInstitution{value: REG_FEE}("MIT", "", MASK_ALL);

        vm.prank(bob); // not admin or delegate
        vm.expectRevert("Not authorized");
        certifier.certify{value: CERT_FEE}(
            1, 1, recipient1, BaseVaultCertifier.CertType.DEGREE, 0, "John", ""
        );
    }

    function test_certify_revertInsufficientFee() public {
        vm.prank(alice);
        certifier.registerInstitution{value: REG_FEE}("MIT", "", MASK_ALL);

        vm.prank(alice);
        vm.expectRevert("Insufficient fee");
        certifier.certify{value: 0.0001 ether}(
            1, 1, recipient1, BaseVaultCertifier.CertType.DEGREE, 0, "John", ""
        );
    }

    // ========== Certify By Hash ==========

    function test_certifyByHash() public {
        vm.prank(alice);
        certifier.registerInstitution{value: REG_FEE}("MIT", "", MASK_ALL);

        bytes32 externalHash = bytes32(uint256(0xDEAD));
        vm.prank(alice);
        uint256 certId = certifier.certifyByHash{value: CERT_FEE}(
            1, externalHash, recipient1, BaseVaultCertifier.CertType.LICENSE, 0, "Bob Smith", ""
        );

        assertEq(certId, 1);
        BaseVaultCertifier.InstitutionalCert memory cert = certifier.getCert(1);
        assertEq(cert.fileId, 0); // not on BaseVault
        assertEq(cert.fileHash, externalHash);
    }

    function test_certifyByHash_linksToBaseVaultFile() public {
        vm.prank(alice);
        certifier.registerInstitution{value: REG_FEE}("MIT", "", MASK_ALL);

        // Use hash of file that exists on BaseVault
        bytes32 existingHash = bytes32(uint256(0x1234));
        vm.prank(alice);
        uint256 certId = certifier.certifyByHash{value: CERT_FEE}(
            1, existingHash, recipient1, BaseVaultCertifier.CertType.DEGREE, 0, "John", ""
        );

        BaseVaultCertifier.InstitutionalCert memory cert = certifier.getCert(certId);
        assertEq(cert.fileId, 1); // linked to file 1
    }

    // ========== Batch Certification ==========

    function test_batchCertify() public {
        vm.prank(alice);
        certifier.registerInstitution{value: REG_FEE}("MIT", "", MASK_ALL);

        uint256[] memory fileIds = new uint256[](2);
        fileIds[0] = 1;
        fileIds[1] = 2;

        address[] memory recipients = new address[](2);
        recipients[0] = recipient1;
        recipients[1] = recipient2;

        string[] memory names = new string[](2);
        names[0] = "John";
        names[1] = "Jane";

        // 10% discount on 2 certs: 0.0005 * 2 * 0.9 = 0.0009
        uint256 expectedFee = (CERT_FEE * 2 * (10000 - BATCH_DISCOUNT)) / 10000;

        vm.prank(alice);
        uint256[] memory certIds = certifier.batchCertify{value: expectedFee}(
            1, fileIds, recipients, BaseVaultCertifier.CertType.DEGREE, 0, names, ""
        );

        assertEq(certIds.length, 2);
        assertEq(certIds[0], 1);
        assertEq(certIds[1], 2);
        assertEq(certifier.certCount(), 2);

        BaseVaultCertifier.Institution memory inst = certifier.getInstitution(1);
        assertEq(inst.certCount, 2);
    }

    function test_batchCertify_refundsExcess() public {
        vm.prank(alice);
        certifier.registerInstitution{value: REG_FEE}("MIT", "", MASK_ALL);

        uint256[] memory fileIds = new uint256[](1);
        fileIds[0] = 1;
        address[] memory recipients = new address[](1);
        recipients[0] = recipient1;
        string[] memory names = new string[](1);
        names[0] = "John";

        uint256 balBefore = alice.balance;
        uint256 expectedFee = (CERT_FEE * 1 * (10000 - BATCH_DISCOUNT)) / 10000;

        vm.prank(alice);
        certifier.batchCertify{value: 1 ether}(
            1, fileIds, recipients, BaseVaultCertifier.CertType.DEGREE, 0, names, ""
        );

        assertEq(balBefore - alice.balance, expectedFee);
    }

    function test_batchCertify_revertArrayMismatch() public {
        vm.prank(alice);
        certifier.registerInstitution{value: REG_FEE}("MIT", "", MASK_ALL);

        uint256[] memory fileIds = new uint256[](2);
        fileIds[0] = 1;
        fileIds[1] = 2;
        address[] memory recipients = new address[](1);
        recipients[0] = recipient1;
        string[] memory names = new string[](2);
        names[0] = "John";
        names[1] = "Jane";

        vm.prank(alice);
        vm.expectRevert("Array mismatch");
        certifier.batchCertify{value: 1 ether}(
            1, fileIds, recipients, BaseVaultCertifier.CertType.DEGREE, 0, names, ""
        );
    }

    function test_batchCertify_revertOver100() public {
        vm.prank(alice);
        certifier.registerInstitution{value: REG_FEE}("MIT", "", MASK_ALL);

        uint256[] memory fileIds = new uint256[](101);
        address[] memory recipients = new address[](101);
        string[] memory names = new string[](101);

        vm.prank(alice);
        vm.expectRevert("Batch 1-100");
        certifier.batchCertify{value: 1 ether}(
            1, fileIds, recipients, BaseVaultCertifier.CertType.DEGREE, 0, names, ""
        );
    }

    // ========== Revocation ==========

    function test_revokeCert() public {
        vm.prank(alice);
        certifier.registerInstitution{value: REG_FEE}("MIT", "", MASK_ALL);

        vm.prank(alice);
        certifier.certify{value: CERT_FEE}(
            1, 1, recipient1, BaseVaultCertifier.CertType.DEGREE, 0, "John", ""
        );

        vm.prank(alice);
        certifier.revokeCert(1, "Fraudulent submission");

        BaseVaultCertifier.InstitutionalCert memory cert = certifier.getCert(1);
        assertTrue(cert.revoked);

        (uint256 rCertId, uint64 revokedAt, string memory reason) = certifier.revocations(1);
        assertEq(rCertId, 1);
        assertGt(revokedAt, 0);
        assertEq(reason, "Fraudulent submission");
    }

    function test_revokeCert_delegateCanRevoke() public {
        vm.prank(alice);
        certifier.registerInstitution{value: REG_FEE}("MIT", "", MASK_ALL);

        vm.prank(alice);
        certifier.setDelegate(1, bob, true);

        vm.prank(alice);
        certifier.certify{value: CERT_FEE}(
            1, 1, recipient1, BaseVaultCertifier.CertType.DEGREE, 0, "John", ""
        );

        vm.prank(bob);
        certifier.revokeCert(1, "Revoked by delegate");

        assertTrue(certifier.getCert(1).revoked);
    }

    function test_revokeCert_revertAlreadyRevoked() public {
        vm.prank(alice);
        certifier.registerInstitution{value: REG_FEE}("MIT", "", MASK_ALL);

        vm.prank(alice);
        certifier.certify{value: CERT_FEE}(
            1, 1, recipient1, BaseVaultCertifier.CertType.DEGREE, 0, "John", ""
        );

        vm.prank(alice);
        certifier.revokeCert(1, "First revoke");

        vm.prank(alice);
        vm.expectRevert("Already revoked");
        certifier.revokeCert(1, "Second revoke");
    }

    function test_revokeCert_revertNotAuthorized() public {
        vm.prank(alice);
        certifier.registerInstitution{value: REG_FEE}("MIT", "", MASK_ALL);

        vm.prank(alice);
        certifier.certify{value: CERT_FEE}(
            1, 1, recipient1, BaseVaultCertifier.CertType.DEGREE, 0, "John", ""
        );

        vm.prank(charlie); // not admin or delegate
        vm.expectRevert("Not authorized");
        certifier.revokeCert(1, "Unauthorized");
    }

    // ========== Validity Checks ==========

    function test_isCertValid_active() public {
        vm.prank(alice);
        certifier.registerInstitution{value: REG_FEE}("MIT", "", MASK_ALL);

        vm.prank(alice);
        certifier.certify{value: CERT_FEE}(
            1, 1, recipient1, BaseVaultCertifier.CertType.DEGREE, 0, "John", ""
        );

        assertTrue(certifier.isCertValid(1));
    }

    function test_isCertValid_revoked() public {
        vm.prank(alice);
        certifier.registerInstitution{value: REG_FEE}("MIT", "", MASK_ALL);

        vm.prank(alice);
        certifier.certify{value: CERT_FEE}(
            1, 1, recipient1, BaseVaultCertifier.CertType.DEGREE, 0, "John", ""
        );

        vm.prank(alice);
        certifier.revokeCert(1, "Revoked");

        assertFalse(certifier.isCertValid(1));
    }

    function test_isCertValid_expired() public {
        vm.prank(alice);
        certifier.registerInstitution{value: REG_FEE}("MIT", "", MASK_ALL);

        uint64 expiresAt = uint64(block.timestamp + 100);
        vm.prank(alice);
        certifier.certify{value: CERT_FEE}(
            1, 1, recipient1, BaseVaultCertifier.CertType.DEGREE, expiresAt, "John", ""
        );

        assertTrue(certifier.isCertValid(1));

        // Fast forward past expiry
        vm.warp(block.timestamp + 200);
        assertFalse(certifier.isCertValid(1));
    }

    function test_isCertValid_institutionSuspended() public {
        vm.prank(alice);
        certifier.registerInstitution{value: REG_FEE}("MIT", "", MASK_ALL);

        vm.prank(alice);
        certifier.certify{value: CERT_FEE}(
            1, 1, recipient1, BaseVaultCertifier.CertType.DEGREE, 0, "John", ""
        );

        assertTrue(certifier.isCertValid(1));

        // Owner suspends institution
        certifier.setInstitutionStatus(1, BaseVaultCertifier.InstitutionStatus.SUSPENDED);
        assertFalse(certifier.isCertValid(1));
    }

    function test_isCertValid_invalidId() public view {
        assertFalse(certifier.isCertValid(0));
        assertFalse(certifier.isCertValid(999));
    }

    // ========== Verify Certifications ==========

    function test_verifyCertifications() public {
        vm.prank(alice);
        certifier.registerInstitution{value: REG_FEE}("MIT", "", MASK_ALL);

        vm.prank(bob);
        certifier.registerInstitution{value: REG_FEE}("Stanford", "", MASK_ALL);

        // Both certify same file
        vm.prank(alice);
        certifier.certify{value: CERT_FEE}(
            1, 1, recipient1, BaseVaultCertifier.CertType.DEGREE, 0, "John", ""
        );

        vm.prank(bob);
        certifier.certify{value: CERT_FEE}(
            2, 1, recipient1, BaseVaultCertifier.CertType.TRANSCRIPT, 0, "John", ""
        );

        bytes32 fileHash = bytes32(uint256(0x1234));
        BaseVaultCertifier.InstitutionalCert[] memory results = certifier.verifyCertifications(fileHash);
        assertEq(results.length, 2);
        assertEq(results[0].institutionId, 1);
        assertEq(results[1].institutionId, 2);
    }

    // ========== Bitmask Enforcement ==========

    function test_bitmask_allTypes() public {
        vm.prank(alice);
        certifier.registerInstitution{value: REG_FEE}("MIT", "", MASK_ALL);

        // Should allow all 13 types
        for (uint8 i = 0; i < 13; i++) {
            vm.prank(alice);
            certifier.certify{value: CERT_FEE}(
                1, 1, recipient1, BaseVaultCertifier.CertType(i), 0, "Test", ""
            );
        }
        assertEq(certifier.certCount(), 13);
    }

    function test_bitmask_singleType() public {
        // Only DEGREE allowed
        vm.prank(alice);
        certifier.registerInstitution{value: REG_FEE}("MIT", "", MASK_DEGREE);

        vm.prank(alice);
        certifier.certify{value: CERT_FEE}(
            1, 1, recipient1, BaseVaultCertifier.CertType.DEGREE, 0, "John", ""
        );

        // GENERIC should fail
        vm.prank(alice);
        vm.expectRevert("Cert type not allowed");
        certifier.certify{value: CERT_FEE}(
            1, 1, recipient1, BaseVaultCertifier.CertType.GENERIC, 0, "John", ""
        );
    }

    // ========== Fee Management ==========

    function test_setFees() public {
        certifier.setFees(0.02 ether, 0.001 ether, 2000);
        assertEq(certifier.institutionRegistrationFee(), 0.02 ether);
        assertEq(certifier.perCertFee(), 0.001 ether);
        assertEq(certifier.batchDiscountBps(), 2000);
    }

    function test_setFees_revertMaxDiscount() public {
        vm.expectRevert("Max 50% discount");
        certifier.setFees(0, 0, 5001);
    }

    function test_setFees_revertNotOwner() public {
        vm.prank(alice);
        vm.expectRevert("Not owner");
        certifier.setFees(0, 0, 0);
    }

    // ========== Owner Functions ==========

    function test_setInstitutionStatus() public {
        vm.prank(alice);
        certifier.registerInstitution{value: REG_FEE}("MIT", "", MASK_ALL);

        certifier.setInstitutionStatus(1, BaseVaultCertifier.InstitutionStatus.SUSPENDED);

        BaseVaultCertifier.Institution memory inst = certifier.getInstitution(1);
        assertEq(uint8(inst.status), uint8(BaseVaultCertifier.InstitutionStatus.SUSPENDED));

        // Suspended institution cannot certify
        vm.prank(alice);
        vm.expectRevert("Institution not active");
        certifier.certify{value: CERT_FEE}(
            1, 1, recipient1, BaseVaultCertifier.CertType.DEGREE, 0, "John", ""
        );
    }

    function test_withdraw() public {
        vm.prank(alice);
        certifier.registerInstitution{value: REG_FEE}("MIT", "", MASK_ALL);

        uint256 balBefore = owner.balance;
        certifier.withdraw();
        assertEq(owner.balance - balBefore, REG_FEE);
    }

    // ========== Events ==========

    function test_emitsCertIssued() public {
        vm.prank(alice);
        certifier.registerInstitution{value: REG_FEE}("MIT", "", MASK_ALL);

        vm.expectEmit(true, true, true, true);
        emit BaseVaultCertifier.CertIssued(
            1, 1, bytes32(uint256(0x1234)), recipient1, BaseVaultCertifier.CertType.DEGREE
        );

        vm.prank(alice);
        certifier.certify{value: CERT_FEE}(
            1, 1, recipient1, BaseVaultCertifier.CertType.DEGREE, 0, "John", ""
        );
    }

    function test_emitsCertRevoked() public {
        vm.prank(alice);
        certifier.registerInstitution{value: REG_FEE}("MIT", "", MASK_ALL);

        vm.prank(alice);
        certifier.certify{value: CERT_FEE}(
            1, 1, recipient1, BaseVaultCertifier.CertType.DEGREE, 0, "John", ""
        );

        vm.expectEmit(true, false, false, true);
        emit BaseVaultCertifier.CertRevoked(1, "Bad");

        vm.prank(alice);
        certifier.revokeCert(1, "Bad");
    }

    // allow receiving ETH for refunds
    receive() external payable {}
}
