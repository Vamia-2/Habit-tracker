import { useEffect,useState } from "react"
import { io } from "socket.io-client"

const socket = io("http://localhost:5000")

export default function Chat(){

  const [text,setText] = useState("")
  const [messages,setMessages] = useState([])

  const user = JSON.parse(atob(localStorage.token.split(".")[1]))

  useEffect(()=>{
    socket.emit("join",user.id)

    socket.on("newMessage",(m)=>{
      setMessages(prev=>[...prev,m])
    })
  },[])

  const send = ()=>{
    socket.emit("sendMessage",{
      text,
      sender:user.id,
      receiver:user.id
    })
  }

  return(
    <div>
      <h1>Chat</h1>

      {messages.map((m,i)=>(
        <div key={i}>{m.text}</div>
      ))}

      <input onChange={e=>setText(e.target.value)}/>
      <button onClick={send}>Send</button>
    </div>
  )
}