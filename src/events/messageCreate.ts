import asa from "index";

export default function test(){
    asa.on('messageCreate', (message) => {
    if(message.content === "test"){
        message.reply("working")
        console.log("[TEST PASSED]")
    }
})
}