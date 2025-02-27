import { BrowserRouter, Routes, Route} from "react-router-dom"
import Signin from "./pages/Signin"
import Signup from "./pages/Signup"
import PageNotFound from "./pages/PageNotFound"


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/signin" element={<Signin />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="*" element={<PageNotFound/>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
