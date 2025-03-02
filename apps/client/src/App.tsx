import { BrowserRouter, Routes, Route } from "react-router-dom"
import Signin from "./pages/Signin"
import Signup from "./pages/Signup"
import PageNotFound from "./pages/PageNotFound"
import { ToastContainer } from "react-toastify"
import { UserProvider } from "./contexts/userContext"
import PrivateRoute from "./components/PrivateRoute"


function App() {
  return (
    <BrowserRouter>
      <UserProvider>
        <Routes>
          <Route path="/signin" element={<Signin />} />
          <Route path="/signup" element={<Signup />} />
          <Route element={<PrivateRoute />}>
            <Route path="/" element={<h1>Home</h1>} />
          </Route>
          <Route path="*" element={<PageNotFound />} />
        </Routes>
        <ToastContainer />
      </UserProvider>
    </BrowserRouter >
  )
}

export default App
