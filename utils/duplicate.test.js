import duplicate from "./duplicate.js";
const run = async () => {
    setInterval(() => {
        console.log(Date.now(), duplicate('SS', [3, 2, 1], 5000))
    }, 1000)
}

run();