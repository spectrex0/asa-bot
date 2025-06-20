import {asa as asa} from "../index.ts";

export default function test(){
    asa.on('messageCreate', (message) => {
    if(message.content === "test"){
        // trash test to see if the bot is reading the messages
        console.log("[TEST PASSED]")
    }
})
}