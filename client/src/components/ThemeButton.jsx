import { useTheme } from "../ThemeContext"
    
export default function ThemeButton(){

  const toggle = ()=>{
    const body = document.body

    if(body.classList.contains("dark")){
      body.classList.remove("dark")
      body.classList.add("light")
    }else{
      body.classList.remove("light")
      body.classList.add("dark")
    }
  }

  return(
    <button className="theme-btn" onClick={toggle}>
      Theme
    </button>
  )
}