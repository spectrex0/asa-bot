import asa from "index";

export default function onDel() {
    asa.on('messageDelete',async (message) => { 
    console.log('[MESSAGE DELETED] from ', message.author, 'Content: ', message.content)
})
}