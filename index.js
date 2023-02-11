const TelegramApi = require('node-telegram-bot-api')
require("dotenv").config();
const bot = new TelegramApi(process.env.BOT_TOKEN, {polling: true})
const ethers = require("ethers")
const network = process.env.NETWORK
const getfaucetval = process.env.GETFAUCETVAL
const timeout = parseInt(process.env.TIMEOUTMINUTE)*60000

var db = require('./request/my_sql_connect.js');
const cuttext = require('./request/cuttext.js')
bot.setMyCommands([
    {command: '/start', description: 'start'},  
    {command: '/add', description: '/add 0x.... - добавить кошелек'},
    {command: '/my', description: 'your wallet'},
    {command: '/faucet', description: 'faucet'},
  ])
const provider = new ethers.providers.getDefaultProvider(network);
const privateKey = process.env.PRIVATE_KEY
const faucetWallet = new ethers.Wallet(privateKey, provider);

async function main(addr){
    const tx = {
        to: addr,
        value: ethers.utils.parseEther(getfaucetval)
        }
    console.log(faucetWallet.address)
    //getBalance
    const balres = await provider.getBalance(faucetWallet.address)
    .then((balance) => {
    // convert a currency unit from wei to ether
    const balanceInEth = ethers.utils.formatEther(balance)
    //console.log(`balance: ${balanceInEth} ETH`)
        if(balanceInEth - getfaucetval <= 1){
            return 'faucet_empty'
        }else{
            return 'norm'
        }
    })
    .catch((err) => {return "error"})

    let getbalres = await balres
    console.log("getbalres:")
    console.log(getbalres)

    if(getbalres=='faucet_empty'){
        return "faucet empty"
    }else if(getbalres=='norm'){
        try{
            const txSend = await faucetWallet.sendTransaction(tx)
            console.log(txSend)
            return(`https://explorer-liberty20.shardeum.org/transaction/${txSend.hash}`)
        }catch (err){
            console.log("txSend неотвечает", err)
            return ("кран не отвечает")
        }
    }else{
        return "Не смогли получить баланс фаусет, проблемы с сетью"
    }
   //return tmp
}
const start = () => {
    bot.on('message', async msg => {
        const text = msg.text;
        //console.log(msg)
        /* if(msg.from.id != chatId){
            return bot.sendMessage(msg.from.id, 'создайте своего бота, в инструкции же написано!');
        } */
        if(text === '/start'){
            return bot.sendMessage(msg.from.id, `Welcome to SHARDEUM Faucet bot!\nenter wallet address, \nExample \n0x359BB95D0A43f4688e948EAE911CDB642eC03fDf`)
        }
        if(text === '/my'){
            //console.log("нажат my") 
                const sql = `SELECT wallet FROM shardbot WHERE userid=?`;
                db.query(sql, [msg.from.id],function(err, resp) {
                    if(err) {
                    bot.sendMessage(msg.from.id,'не удалось достать данные | failed to retrieve data')             
                    return console.log(err);
                    }                    
                    if(resp && resp!=''){
                        return bot.sendMessage(msg.from.id,`Ваш кошелек ${resp[0]['wallet']}`)
                    }else{
                        return bot.sendMessage(msg.from.id,`Вы еще не добавили кошелек`)
                    }
                })
                
            return
            }
        if((/^\/add\s0x[A-Za-z0-9]{40}$/gm).test(text)){
            const userwallet=text.replace("/add ", "").trim();
            const sql = `SELECT wallet FROM shardbot WHERE userid=?`;
            db.query(sql, [msg.from.id],function(err, resp) {
                if(err) {
                bot.sendMessage(msg.from.id,'не удалось достать данные | failed to retrieve data')             
                return console.log(err);
                }
                console.log(resp)
                //bot.sendMessage(msg.from.id,`ip ${ip} добавлен к юзеру ${msg.from.id}`)
                if(resp && resp!=''){                
                    return bot.sendMessage(msg.from.id,`Разрешено иметь только один кошелек\nВы уже имеете кошелек ${resp[0]['wallet']}`)
                }else{
                    console.log('resp')
                    const sql2 = `INSERT INTO shardbot(userid,wallet) VALUES (?, ?);`
                    db.query(sql2, [msg.from.id,userwallet],function(err, resp) {
                        if(err) {
                        console.log(err);
                        return bot.sendMessage(msg.from.id,'не удалось добавить данные')
                        }
                        return bot.sendMessage(msg.from.id,`wallet ${userwallet} added to user ${msg.from.id}`)
                        //console.log('Inserted ')
                    })
                }
            })
            return
        }

      if(text === '/faucet'){
        //console.log("нажат my") 
        const sql = `SELECT wallet,timestamp FROM shardbot WHERE userid=?`;
        db.query(sql, [msg.from.id],async function(err, resp) {
            if(err) {
            bot.sendMessage(msg.from.id,'не удалось достать данные | failed to retrieve data')             
            return console.log(err);
            }
            console.log('timestamp: ',parseInt(resp[0]['timestamp']))
            console.log('datenow: ',Date.now())
            let vremya = ((Date.now() - parseInt(resp[0]['timestamp']))>0) ? true : false            
            if(resp && resp!=''){                
                if(vremya){
                    const tmp = await main(resp[0]['wallet'])
                    const sql2 = `UPDATE shardbot SET timestamp=? WHERE userid=${msg.from.id}`;
                    let time_ = Date.now()+timeout;
                    //console.log(typeof(time_))
                    db.query(sql2,String(time_),async function(err, resp) {
                        if(err) {
                        bot.sendMessage(msg.from.id,'не удалось обновить данные')
                        return console.log(err);
                        }
                    })
                return bot.sendMessage(msg.from.id, cuttext(tmp));
                }else{
                    return bot.sendMessage(msg.from.id, `бот на зарядке, осталось ${Math.round(Date.now() - parseInt(resp[0]['timestamp']))/1000} sec`);
                }
            }else{
                return bot.sendMessage(msg.from.id,`Вы еще не добавили кошелек`)
            }
        })
        return
        /* const tmp = await main(text)
        return bot.sendMessage(chatId, cuttext(tmp)); */
      }

      return bot.sendMessage(msg.from.id, `Unknown command\nenter wallet address\nExample\n0x359BB95D0A43f4688e948EAE911CDB642eC03fDf`)
      
    })
  }
  
  start()
//main()