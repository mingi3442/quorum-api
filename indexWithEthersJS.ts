//With ethers.js

import bodyParser from "body-parser";
import { ethers } from "ethers";
import express, { Request, Response } from "express";
import Web3 from "web3";
// import ethers from "ethers";
var solc = require("solc");
const sampleContract = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

contract SimpleStorage {
    uint storedData;

    function set(uint x) public {
        storedData = x;
    }

    function get() public view returns (uint) {
        return storedData;
    }
}
`;
var privateKey = Buffer.from("0x60bbe10a196a4e71451c0f6e9ec9beab454c2a5ac0542aa5b8b733ff5719fec3", "hex");
const pk = "0x60bbe10a196a4e71451c0f6e9ec9beab454c2a5ac0542aa5b8b733ff5719fec3";
const rpcnode = {
  name: "rpcnode",
  url: "http://127.0.0.1:8545",
  wsUrl: "ws://127.0.0.1:8546",
  nodekey: "0e93a540518eeb673d94fb496b746008ab56605463cb9212493997f5755124d1",
  accountAddress: "c9c913c8c3c1cd416d80a0abf475db2062f161f6",
  accountPrivateKey: "0x60bbe10a196a4e71451c0f6e9ec9beab454c2a5ac0542aa5b8b733ff5719fec3",
};
const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

const app = express();
const port = 8080;

app.use(bodyParser.text({ type: "text/plain" }));
function compile(sourceCode: string, contractName: string) {
  const input = {
    language: "Solidity",
    sources: { main: { content: sourceCode } },
    settings: { outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } } },
  };

  const output = solc.compile(JSON.stringify(input));
  const artifact = JSON.parse(output).contracts.main[contractName];
  return {
    abi: artifact.abi,
    bytecode: artifact.evm.bytecode.object,
  };
}

async function getValueAtAddress(provider: any, deployedContractAbi: any, deployedContractAddress: any) {
  const contract = new ethers.Contract(deployedContractAddress, deployedContractAbi, provider);
  const res = await contract.get();
  console.log("Obtained value at deployed contract is: " + res);
  return res;
}

// You need to use the accountAddress details provided to Quorum to send/interact with contracts
async function setValueAtAddress(provider: any, wallet: any, deployedContractAbi: any, deployedContractAddress: any, value: any) {
  const contract = new ethers.Contract(deployedContractAddress, deployedContractAbi, provider);
  const contractWithSigner = contract.connect(wallet);

  const tx = await contractWithSigner.waitForDeployment();

  return tx;
}

const createContract = async () => {
  const provider = new ethers.JsonRpcProvider(rpcnode.url);

  const wallet = new ethers.Wallet(rpcnode.accountPrivateKey, provider);

  const { abi: contractAbi, bytecode: contractByteCode } = compile(sampleContract, "SimpleStorage");

  const factory = new ethers.ContractFactory(contractAbi, contractByteCode, wallet);
  const contract = await factory.deploy({
    gasLimit: 1000000,
    gasPrice: 0,
    // nonce: 1,
  });

  const deployed = await contract.deploymentTransaction()?.wait();
  return contract;
};

app.get("/test", async (req: Request, res: Response) => {
  const provider = new ethers.JsonRpcProvider(rpcnode.url);
  const wallet = new ethers.Wallet(rpcnode.accountPrivateKey, provider);

  const { abi: contractAbi, bytecode: contractByteCode } = compile(sampleContract, "SimpleStorage");
  createContract()
    .then(async function (contract) {
      console.log("Contract deployed at address: " + contract?.getAddress());
      console.log("Use the smart contracts 'get' function to read the contract's constructor initialized value .. ");
      await getValueAtAddress(provider, contractAbi, contract?.getAddress());
      console.log("Use the smart contracts 'set' function to update that value to 123 .. ");
      await setValueAtAddress(provider, wallet, contractAbi, contract?.getAddress(), 123);
      console.log("Verify the updated value that was set .. ");
      await getValueAtAddress(provider, contractAbi, contract?.getAddress());
    })
    .catch(console.error);
});

app.get("/", async (req: Request, res: Response) => {
  await web3.eth.getAccounts().then((result: any) => {
    console.log(result);
    web3.eth.getBalance(result[0]).then((balance: any) => {
      console.log(balance);
    });
  });
  await web3.eth.getGasPrice().then((result: any) => {
    console.log("Gas Price : " + result);
  });
  await web3.eth.getBlockNumber().then((result: any) => {
    console.log(result);
    res.send("Latest Block Number is : " + result);
  });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
