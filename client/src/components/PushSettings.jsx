import axios from "axios"

export default function PushSettings(){

  const subscribe = async ()=>{

    const reg = await navigator.serviceWorker.register("/sw.js")

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly:true,
      applicationServerKey:"ТУТ_PUBLIC_KEY"
    })

    await axios.post("/api/subscribe",sub,{
      headers:{Authorization:localStorage.getItem("token")}
    })

    alert("Push увімкнено")
  }

  return(
    <button onClick={subscribe}>
        Увімкнути нагадування
    </button>
  )
}