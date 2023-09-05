//With web3.js

import bodyParser from "body-parser";
import express, { Request, Response } from "express";
import Web3 from "web3";
var solc = require("solc");

const sampleContract = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

contract SimpleStorage {
    uint storedData = 0;

    function set(uint x) public {
        storedData = x;
    }

    function get() public view returns (uint) {
        return storedData;
    }
}
`;
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

// app.use(bodyParser.text({ type: "text/plain" }));

function compile(sourceCode: string, contractName: string) {
  const input = {
    language: "Solidity",
    sources: { main: { content: sourceCode } },
    settings: { outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } }, evmVersion: "byzantium" },
  };
  // Parse the compiler output to retrieve the ABI and bytecode
  const output = solc.compile(JSON.stringify(input));
  console.log(JSON.parse(output));
  const artifact = JSON.parse(output).contracts.main[contractName];
  return {
    abi: artifact.abi,
    bytecode: artifact.evm.bytecode.object,
  };
}

async function createContract(host: string, contractAbi: any, contractBytecode: any) {
  const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
  const account = web3.eth.accounts.create();
  const contract = new web3.eth.Contract(contractAbi);
  console.log(account);
  const deployedContract = await contract
    .deploy({
      data: "0x" + contractBytecode,
    })
    .send({
      from: "0x" + rpcnode.accountAddress,
      gas: "0x2CA51", // 가스 제한
      gasPrice: "0x0", // 가스 가격
    });

  console.log("Contract deployed at:", deployedContract.options.address);
  console.log("Transaction hash:", deployedContract);
  return deployedContract.options.address;
  // initialize the default constructor with a value `47 = 0x2F`; this value is appended to the bytecode
  // const contractConstructorInit = web3.eth.abi.encodeParameter("uint256", "47").slice(2);

  // const txn = {
  //   chainId: 1337,
  //   nonce: await web3.eth.getTransactionCount(account.address), // 0x00 because this is a new account
  //   from: account.address,
  //   to: null, //public tx
  //   value: "0x00",
  //   data: "0x" + contractBytecode + contractConstructorInit,
  //   gasPrice: "0x0", //ETH per unit of gas
  //   gas: "0x2CA51", //max number of gas units the tx is allowed to use
  // };

  // console.log("create and sign the txn");
  // const signedTx = await web3.eth.accounts.signTransaction(txn, account.privateKey);
  // console.log("sending the txn");
  // const txReceipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
  // console.log("tx transactionHash: " + txReceipt.transactionHash);
  // console.log("tx contractAddress: " + txReceipt.contractAddress);
  // return txReceipt;
}

async function setValueAtAddress(host: any, accountAddress: any, value: any, deployedContractAbi: any, deployedContractAddress: any) {
  const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
  const contractInstance: any = new web3.eth.Contract(deployedContractAbi, deployedContractAddress);
  const res = await contractInstance.methods.set(value).send({ from: "0x" + accountAddress, gasPrice: "0x0", gas: "0x2CA51" });
  console.log("Set value on contract at : " + res.transactionHash);

  return res;
  // const res = await contractInstance
  // const res = await contractInstance.send({ from: accountAddress, gasPrice: "0x0", maxFeePerGas: "0x24A22" });
  // const res = await contractInstance.setConfig
  // console.log("Set value on contract at : " + res.transactionHash);
  // verify the updated value
  // const readRes = await contractInstance.methods.get().call();
  // console.log("Obtained value at deployed contract is: "+ readRes);
  // return;
}

async function getValueAtAddress(host: any, accountAddress: any, deployedContractAbi: any, deployedContractAddress: any) {
  const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
  web3.eth.handleRevert = true;
  const contractInstance = new web3.eth.Contract(deployedContractAbi, deployedContractAddress);
  // const res = await contractInstance.methods.get().send({ from: "0x" + accountAddress, gasPrice: "0x0", gas: "0x2CA51" });
  const res = await contractInstance.methods
    .get()
    .call()
    .catch((err: any) => {
      console.log(err);
    });

  console.log("Obtained value at deployed contract is: " + res);
  return res;
}

async function getAllPastEvents(host: any, deployedContractAbi: any, deployedContractAddress: any) {
  const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
  const contractInstance = new web3.eth.Contract(deployedContractAbi, deployedContractAddress);
  const res = await contractInstance.getPastEvents("allEvents", {
    fromBlock: 0,
    toBlock: "latest",
  });

  const amounts = res.map((x) => {
    return x;
  });

  console.log("Obtained all value events from deployed contract : [" + amounts + "]");
  console.log(res);
  return res;
}

app.get("/test", async (req: Request, res: Response) => {
  const accountAddress = rpcnode.accountAddress;
  const { abi: contractAbi, bytecode: contractByteCode } = compile(sampleContract, "SimpleStorage");
  // const ca = await createContract(rpcnode.url, contractAbi, contractByteCode);
  const ca = "0xBca0fDc68d9b21b5bfB16D784389807017B2bbbc";

  await getValueAtAddress(rpcnode.url, accountAddress, contractAbi, ca);
  // await setValueAtAddress(rpcnode.url, accountAddress, 123, contractAbi, ca);
  // await getValueAtAddress(rpcnode.url, contractAbi, ca);
  return "Success";
  // await getValueAtAddress(rpcnode.url, contractAbi, tx.contractAddress);
  // .then(async function (tx) {
  //   console.log("Contract deployed at address: " + tx.contractAddress);
  //   console.log("Use the smart contracts 'get' function to read the contract's constructor initialized value .. ");
  //   await getValueAtAddress(rpcnode.url, contractAbi, tx.contractAddress);
  //   console.log("Use the smart contracts 'set' function to update that value to 123 .. ");
  //   await setValueAtAddress(rpcnode.url, accountAddress, 123, contractAbi, tx.contractAddress);
  //   console.log("Verify the updated value that was set .. ");
  //   await getValueAtAddress(rpcnode.url, contractAbi, tx.contractAddress);
  //   await getAllPastEvents(rpcnode.url, contractAbi, tx.contractAddress);
  // })
  // .catch(console.error);
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
