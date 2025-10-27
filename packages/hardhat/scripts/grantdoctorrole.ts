import { ethers } from "hardhat";
import { keccak256, toUtf8Bytes } from "ethers";

async function main() {
  const contractAddress = "0xYourDeployedContractAddress";
  const doctorAddress = "0x74927AB82508561D630df8c2940eFfbe9B863A96";

  const DOCTOR_ROLE = keccak256(toUtf8Bytes("DOCTOR_ROLE"));
  console.log("DOCTOR_ROLE hash:", DOCTOR_ROLE);

  // Use getContractAt to get the contract instance with full typings
  const contract = await ethers.getContractAt("HealthRecordNFT", contractAddress);

  console.log(`Granting DOCTOR_ROLE to ${doctorAddress}...`);
  const tx = await contract.grantRole(DOCTOR_ROLE, doctorAddress);
  console.log("Transaction sent. Waiting for confirmation...");

  await tx.wait();

  console.log(`DOCTOR_ROLE granted to ${doctorAddress}!`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
