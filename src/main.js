import { GoogleGenerativeAI } from "@google/generative-ai";

import dotenv from 'dotenv';

import cheerio from 'cheerio';
import fetch from 'node-fetch';
import { FunctionDeclarationSchemaType } from "@google/generative-ai";

const generationConfig = {
    maxOutputTokens: 2000,
    temperature: 0.1, // make this lower for more deterministic results
};


const modelName = "gemini-pro";
// This is the function that will be called by the generative AI
const functions = {
    getRecipe: async ({ value }) => {
        console.log("Searching on budgetbytes.com for : ", value)
        // search for a recipe on budgetbytes.com
        // convert value to a search string
        let query = value.replace(/\s+/g, "+").toLowerCase().replace("recipe", ""); ``
        // download the search results page
        const searchUrl = `https://www.budgetbytes.com/?s=${query}`;
        let response = await fetch(searchUrl);
        let text = await response.text();
        // grab the URL for the first search result
        let $ = cheerio.load(text);
        // the links are in the class archive-post-listing
        const recipe = $('.archive-post-listing a').first().attr('href');
        // if recipe is undefined, return an error
        if (!recipe) {
            console.log("No recipe found for this on budget bytes");
            return { error: true };
        }
        // download the html and then parse out the ingredients and instructions
        response = await fetch(recipe);
        text = await response.text();
        // console.log(text);
        $ = cheerio.load(text);
        const ingredients = $('.wprm-recipe-ingredient').map((i, el) => $(el).text()).get();
        const instructions = $('.wprm-recipe-instruction').map((i, el) => $(el).text()).get();
        const output = { url: recipe, ingredients, instructions };
        return output;
    }
};

const tools = [
    {
        functionDeclarations: [
            {
                name: "getRecipe",
                description: "Retrieve a recipe from budgetbytes.com. Only use this when explicitely asked",
                parameters: {
                    type: FunctionDeclarationSchemaType.OBJECT,
                    properties: {
                        value: { type: FunctionDeclarationSchemaType.STRING },
                    },
                    required: ["value"],
                },
            },
        ],
    },
];


async function generateWithoutTools(prompt, model) {
    const result = await model.generateContent({
        contents: [prompt],
    });
    if (result.response.candidates[0].content.parts.length === 0) {
        throw new Error("No parts");
    }
    console.log(result.response.candidates[0].content.parts.map(({ text }) => text).join(""));
}

// check the environment for the GOOGLE_API_KEY. Should be set or in the .env file
dotenv.config();
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
if (!GOOGLE_API_KEY || GOOGLE_API_KEY === "undefined") {
    throw new Error("Missing GOOGLE_API_KEY environment variable");
}

// check the command line for a search query
const search = process.argv[2];
if (!search) {
    throw new Error("Missing search query");
}

const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);


const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: generationConfig,
}, { apiVersion: "v1beta" });

const prompt = {
    role: "user",
    parts: [
        {
            text: search,
        },
    ],
};

const result = await model.generateContent({
    contents: [prompt],
    tools: tools,
});
const content = result.response.candidates[0].content;
if (content.parts.length === 0) {
    throw new Error("No parts");
}
const fc = content.parts[0].functionCall;
if (fc) {
    const { name, args } = fc;
    const fn = functions[name]; ``
    if (!fn) {
        throw new Error(`Unknown function "${name}"`);
    }
    const { url, ingredients, instructions, error } = await functions[name](args)
    if (error) {
        generateWithoutTools(prompt, model);
    } else {
        // print ingredients and instrcutions to the console, separated by a newline
        console.log("URL:", url);
        console.log("Ingredients:\n", ingredients.join("\n"));
        console.log("Instructions:\n", instructions.join("\n"));
    }

} else {
    generateWithoutTools(prompt, model);
}