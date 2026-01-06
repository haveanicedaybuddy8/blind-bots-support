import { getProductContext } from './src/knowledge_base.js';

(async () => {
    console.log("--- Loading Context ---");
    const context = await getProductContext();
    console.log(context);
})();