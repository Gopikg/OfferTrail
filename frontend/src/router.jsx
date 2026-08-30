import { createBrowserRouter } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import AddApplication from "./pages/AddApplication";
import EditApplication from "./pages/EditApplication";
import Gmail from "./pages/Gmail";
import PlacementAdmin from "./pages/PlacementAdmin";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />,
  },
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
  path: "/applications/new",
  element: (
    <ProtectedRoute>
      <AddApplication />
    </ProtectedRoute>
  ),
},
{
  path: "/gmail",
  element: (
    <ProtectedRoute>
      <Gmail />
    </ProtectedRoute>
  ),
},
{
  path: "/applications/edit/:id",
  element: (
    <ProtectedRoute>
      <EditApplication />
    </ProtectedRoute>
  ),
}
,
{
  path: "/placement-admin",
  element: (
    <ProtectedRoute>
      <PlacementAdmin />
    </ProtectedRoute>
  ),
}
]);

export default router;
