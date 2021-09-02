import { Client, Contract, Order } from '../index.js';



async function run() {
  let api = new Client({
    host: '127.0.0.1',
    port: 4004
  });

  let order1 = await api.reqCompletedOrders();
  console.log(order1[0])
}



run()
  .then(() => {
  })
  .catch((e) => {
    console.log('failure');
    console.log(e);
    process.exit();
  });
