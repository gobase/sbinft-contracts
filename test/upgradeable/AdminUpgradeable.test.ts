/* eslint-disable node/no-missing-import */
import { ethers } from "hardhat";
import * as hre from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract, ContractReceipt } from "ethers";

describe("Admin", function () {
  let deployer: SignerWithAddress;
  let nonAdmin: SignerWithAddress;
  let address1: SignerWithAddress;
  let address2: SignerWithAddress;
  let address3: SignerWithAddress;

  let cAdminUpgradeableMock: Contract;
  const newAdmminZeroError = "Admin:addAdmin newAdmin is the zero address";
  const callerOnlyAdminError = "Admin:onlyAdmin caller is not an Admin";
  const cremoveNonExistAdminError =
    "Admin:removeAdmin trying to remove non existing Admin";

  beforeEach(async function () {
    [deployer, nonAdmin, address1, address2, address3] =
      await ethers.getSigners();

    const cfAdminUpgradeableContract = await ethers.getContractFactory(
      "AdminUpgradeableMock"
    );
    cAdminUpgradeableMock = await hre.upgrades.deployProxy(
      cfAdminUpgradeableContract,
      [],
      {
        kind: "uups",
        initializer: "__AdminUpgradeableMock_init",
      }
    );
    await cAdminUpgradeableMock.deployed();
  });

  describe("Post deployment checks", function () {
    it("[R] could not initialize", async function () {
      await expect(
        cAdminUpgradeableMock.__AdminUpgradeableMock_init()
      ).to.be.revertedWith("Initializable: contract is already initialized");
    });
    it("even deployer is not an admin", async function () {
      expect(await cAdminUpgradeableMock.isAdmin(deployer.address)).to.equal(
        true
      );
    });

    it("non deployer is not admin", async function () {
      expect(await cAdminUpgradeableMock.isAdmin(nonAdmin.address)).to.equal(
        false
      );
    });
  });

  describe("addAdmin", function () {
    it("check adding zero address as admin", async function () {
      await expect(
        cAdminUpgradeableMock.addAdmin(ethers.constants.AddressZero)
      ).to.be.revertedWith(newAdmminZeroError);
      expect(
        await cAdminUpgradeableMock.isAdmin(ethers.constants.AddressZero)
      ).to.equal(false);
    });

    it("can add admin", async function () {
      const addAdminTx = await cAdminUpgradeableMock.addAdmin(address1.address);
      const receipt: ContractReceipt = await addAdminTx.wait();
      const { events } = receipt;

      expect(events).to.be.an("array").to.have.lengthOf(1);
      const eventSignature = events?.map((item) => item.eventSignature);
      expect(eventSignature).to.include.members(["AdminAdded(address)"]);

      expect(await cAdminUpgradeableMock.isAdmin(address1.address)).to.equal(
        true
      );
    });

    it("[R]can not add admin from non admin signer", async function () {
      await expect(
        cAdminUpgradeableMock.connect(address1).addAdmin(address1.address)
      ).to.be.revertedWith(callerOnlyAdminError);
    });
  });

  describe("removeAdmin", function () {
    it("[R] removing zero address", async function () {
      await expect(
        cAdminUpgradeableMock.addAdmin(ethers.constants.AddressZero)
      ).to.be.revertedWith(newAdmminZeroError);
      await expect(
        cAdminUpgradeableMock.removeAdmin(ethers.constants.AddressZero)
      ).to.be.revertedWith(cremoveNonExistAdminError);
    });

    it("[R]can not remove admin from non admin signer", async function () {
      await expect(
        cAdminUpgradeableMock.connect(address1).removeAdmin(address2.address)
      ).to.be.revertedWith(callerOnlyAdminError);
    });

    it("[R]can not remove admin non admin signer", async function () {
      await cAdminUpgradeableMock.addAdmin(address1.address);
      await expect(
        cAdminUpgradeableMock.connect(address1).removeAdmin(address2.address)
      ).to.be.revertedWith(cremoveNonExistAdminError);
      expect(await cAdminUpgradeableMock.isAdmin(address1.address)).to.equal(
        true
      );
    });

    it("can remove admin", async function () {
      await cAdminUpgradeableMock.addAdmin(address1.address);
      expect(await cAdminUpgradeableMock.isAdmin(address1.address)).to.equal(
        true
      );
      const reemoveAdminTx = await cAdminUpgradeableMock.removeAdmin(
        address1.address
      );

      const receipt: ContractReceipt = await reemoveAdminTx.wait();
      const { events } = receipt;

      expect(events).to.be.an("array").to.have.lengthOf(1);
      const eventSignature = events?.map((item) => item.eventSignature);
      expect(eventSignature).to.include.members(["AdminRemoved(address)"]);

      expect(await cAdminUpgradeableMock.isAdmin(address1.address)).to.equal(
        false
      );
    });
  });

  describe("isAdmin", function () {
    it("[R] check zero address", async function () {
      await expect(
        cAdminUpgradeableMock.addAdmin(ethers.constants.AddressZero)
      ).to.be.revertedWith(newAdmminZeroError);

      expect(
        await cAdminUpgradeableMock.isAdmin(ethers.constants.AddressZero)
      ).to.equal(false);
    });

    it("check admin ", async function () {
      expect(await cAdminUpgradeableMock.isAdmin(deployer.address)).to.equal(
        true
      );
      expect(await cAdminUpgradeableMock.isAdmin(address1.address)).to.equal(
        false
      );
    });
  });
});
