//With web3.js
const path = require("path");
const fs = require("fs-extra");
import bodyParser from "body-parser";
import express, { Request, Response } from "express";
import Web3 from "web3";
var solc = require("solc");

// 컴파일 및 배포할 컨트랙트 소스코드
const sampleContract = `// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

contract SimpleStorage {
  uint public storedData;
  event stored(address _to, uint _amount);

  constructor(uint initVal) {
    require(initVal >= 0, "Initial value should be non-negative");
    emit stored(msg.sender, initVal);
    storedData = initVal;
  }

  function set(uint x) public {
    require(x >= 0, "Value should be non-negative");
    emit stored(msg.sender, x);
    storedData = x;
  }

  function get() view public returns (uint retVal) {
    return storedData;
  }
}
`;
// Quorum Network RPC Node 정보
const rpcnode = {
  name: "rpcnode",
  url: "http://127.0.0.1:8545",
  wsUrl: "ws://127.0.0.1:8546",
  nodekey: "0e93a540518eeb673d94fb496b746008ab56605463cb9212493997f5755124d1",
  accountAddress: "c9c913c8c3c1cd416d80a0abf475db2062f161f6",
  accountPrivateKey: "0x60bbe10a196a4e71451c0f6e9ec9beab454c2a5ac0542aa5b8b733ff5719fec3",
};
// JSON 파일로 가져오기
// const contractJsonPath = path.resolve(__dirname, "./", "./", "contracts", "SimpleStorage.json");
// const contractJson = JSON.parse(fs.readFileSync(contractJsonPath));
// const contractAbi = contractJson.abi;
// const contractByteCode = contractJson.evm.bytecode.object;

const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
const app = express();
const port = 8080;

// app.use(bodyParser.text({ type: "text/plain" }));

// Quorum quick start에서 제공하는 compile에서 사용되는 sources를 빌드하는 함수
function buildSources(contractString: string, contractName: string) {
  const sources: any = {};
  sources[`${contractName}.sol`] = {
    content: contractString,
  };
  return sources;
}

function compile(sourceCode: string, contractName: string) {
  // solc.js 를 이용해서 컴파일할 소스코드 정보 설정
  const input = {
    language: "Solidity",
    sources: { main: { content: sourceCode } },
    // sources: buildSources(sampleContract, contractName),
    settings: {
      outputSelection: {
        "*": {
          "*": ["*", "evm.bytecode"],
        },
      },
      evmVersion: "byzantium",
    },
  };
  // 컴파일 후 저장
  const output = solc.compile(JSON.stringify(input));
  // const stringifiedJson = JSON.stringify(input);
  // const compilationResult = solc.compile(stringifiedJson);

  // const compiledContracts = output.contracts;
  // for (let contract in compiledContracts) {
  //   for (let contractName in compiledContracts[contract]) {
  //     fs.outputJsonSync(path.resolve("./", `${contractName}.json`), compiledContracts[contract][contractName], { spaces: 2 });
  //   }
  // }
  // const contractsPath = path.resolve(__dirname, "./", "contracts");
  // fs.outputJsonSync(path.resolve(contractsPath, `${contractName}.json`), JSON.parse(output).contracts.main[contractName], { spaces: 2 });
  // const output = JSON.parse(compilationResult);

  // 컴파일 한 결과를 JSON으로 파싱 후 contract정보 반환
  const artifact = JSON.parse(output).contracts.main[contractName];
  return {
    abi: artifact.abi,
    bytecode: artifact.evm.bytecode.object,
  };
}

async function createContract(host: string, contractAbi: any, contractBytecode: any) {
  const web3 = new Web3(new Web3.providers.HttpProvider(host));

  const account = web3.eth.accounts.create();
  const contract = new web3.eth.Contract(contractAbi);
  const contractConstructorInit = web3.eth.abi.encodeParameter("uint256", "47").slice(2);

  const txn = {
    chainId: 1337,
    nonce: await web3.eth.getTransactionCount(account.address),
    from: account.address,
    to: null, //public tx
    value: "0x00",
    data: "0x" + contractBytecode + contractConstructorInit,
    gasPrice: "0x0", //ETH per unit of gas
    gas: "0x1E8480", // which is equivalent to 2000000 in decimal
  };
  console.log("create and sign the txn");
  const signedTx = await web3.eth.accounts.signTransaction(txn, account.privateKey);
  console.log("sending the txn");
  const txReceipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
  console.log("tx transactionHash: " + txReceipt.transactionHash);
  console.log("tx contractAddress: " + txReceipt.contractAddress);
  return txReceipt;
}

async function setValueAtAddress(host: any, accountAddress: any, value: any, deployedContractAbi: any, deployedContractAddress: any) {
  const web3 = new Web3(new Web3.providers.HttpProvider(host));
  const contractInstance: any = new web3.eth.Contract(deployedContractAbi, deployedContractAddress);
  const res = await contractInstance.methods.set(value).send({ from: "0x" + accountAddress, gasPrice: "0x0", gas: "0x1E8480" });
  console.log("Set value on contract at : " + res.transactionHash);
  console.log(res);
  return res;
}

async function getValueAtAddress(host: any, deployedContractAbi: any, deployedContractAddress: any) {
  const web3 = new Web3(new Web3.providers.HttpProvider(host));
  const contractInstance = new web3.eth.Contract(deployedContractAbi, deployedContractAddress);

  //revert 처리
  contractInstance.handleRevert = true;

  const res = await contractInstance.methods
    .get()
    .call()
    .then((result: any) => {
      console.log("result : ", result);
    })
    .catch((err: any) => {
      console.log("err : ", err);
    });

  console.log("Obtained value at deployed contract is: " + res);

  return res;
}

async function getAllPastEvents(host: any, deployedContractAbi: any, deployedContractAddress: any) {
  const web3 = new Web3(new Web3.providers.HttpProvider(host));
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

async function isContractAddress(web3: any, address: any) {
  // 주소 형식이 유효한지 확인
  if (!web3.utils.isAddress(address)) {
    return false;
  }
  // 해당 주소의 코드를 가져옴
  const code = await web3.eth.getCode(address);

  // 코드가 '0x'와 같거나 비어 있지 않으면 컨트랙트 주소로 판단
  return code && code !== "0x";
}

app.get("/test", async (req: Request, res: Response) => {
  // const account = await web3.eth.accounts.privateKeyToAccount(rpcnode.accountPrivateKey);

  const { abi: contractAbi, bytecode: contractByteCode } = compile(sampleContract, "SimpleStorage");

  const tx = await createContract(rpcnode.url, contractAbi, contractByteCode);
  createContract(rpcnode.url, contractAbi, contractByteCode).then(async (tx) => {
    // console.log("tx : ", tx);
    const isContract = await isContractAddress(web3, tx.contractAddress);

    if (isContract) {
      console.log(tx.contractAddress + "는 유효한 컨트랙트 주소입니다.");
    } else {
      console.log(tx.contractAddress + "는 컨트랙트 주소가 아닙니다.");
    }
    await setValueAtAddress(rpcnode.url, rpcnode.accountAddress, 123, contractAbi, tx.contractAddress);
    await getValueAtAddress(rpcnode.url, contractAbi, tx.contractAddress);
  });
  // console.log("CONTRACT DEPLOYED");

  return "value : ";
});

app.get("/", async (req: Request, res: Response) => {
  await web3.eth.getAccounts().then((result: any) => {
    console.log("account : ", result);
    web3.eth.getBalance(result[0]).then((balance: any) => {
      console.log("balance : ", balance);
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
