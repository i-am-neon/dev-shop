import { ChatOpenAI } from "langchain/chat_models/openai";
import { ConversationalRetrievalQAChain } from "langchain/chains";
import { HNSWLib } from "langchain/vectorstores/hnswlib";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { BufferMemory } from "langchain/memory";

import * as fs from "fs";

export const run = async () => {
    console.log('CHAT MEM STARTED');

    const text = fs.readFileSync("src/playground/state_of_the_union.txt", "utf8");
    const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000 });
    const docs = await textSplitter.createDocuments([text]);
    const vectorStore = await HNSWLib.fromDocuments(docs, new OpenAIEmbeddings());
    const fasterModel = new ChatOpenAI({
        modelName: "gpt-3.5-turbo",
    });
    const slowerModel = new ChatOpenAI({
        modelName: "gpt-4",
    });
    const chain = ConversationalRetrievalQAChain.fromLLM(
        slowerModel,
        vectorStore.asRetriever(),
        {
            returnSourceDocuments: true,
            memory: new BufferMemory({
                memoryKey: "chat_history",
                inputKey: "question", // The key for the input to the chain
                outputKey: "text", // The key for the final conversational output of the chain
                returnMessages: true, // If using with a chat model
            }),
            questionGeneratorChainOptions: {
                llm: fasterModel,
            },
        }
    );
    /* Ask it a question */
    const question = "What did the president say about Justice Breyer?";
    const res = await chain.call({ question });
    console.log('res :>> ', res);
    console.log('============================');

    const followUpRes = await chain.call({ question: "Was that nice?" });
    console.log('followUpRes :>> ', followUpRes);
    console.log('============================');

    console.log('chain.memory :>> ', chain.memory);
};