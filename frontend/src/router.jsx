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
import OfferCoordinator from "./pages/OfferCoordinator";
import GetStarted from "./pages/GetStarted";
import DocumentTitle from "./components/DocumentTitle";
import Notifications from "./pages/Notifications";

function titled(title, element) {
  return <DocumentTitle title={title}>{element}</DocumentTitle>;
}

const router = createBrowserRouter([
  {
    path: "/",
    element: titled("Placement overview", <Home />),
  },
  {
    path: "/login",
    element: titled("Sign in", <Login />),
  },
  {
    path: "/register",
    element: titled("Create account", <Register />),
  },
  {
    path: "/get-started",
    element: titled("Get started", <GetStarted />),
  },
  {
    path: "/dashboard",
    element: titled("Application dashboard", (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    )),
  },
  {
  path: "/applications/new",
  element: titled("Add application", (
    <ProtectedRoute>
      <AddApplication />
    </ProtectedRoute>
  )),
},
  {
  path: "/gmail",
  element: titled("Mail updates", (
    <ProtectedRoute>
      <Gmail />
    </ProtectedRoute>
  )),
},
{
  path: "/notifications",
  element: titled("Notifications", (
    <ProtectedRoute>
      <Notifications />
    </ProtectedRoute>
  )),
},
{
  path: "/applications/edit/:id",
  element: titled("Edit application", (
    <ProtectedRoute>
      <EditApplication />
    </ProtectedRoute>
  )),
}
,
{
  path: "/placement-admin",
  element: titled("Placement admin", (
    <ProtectedRoute requiredAccess="isPlacementAdmin">
      <PlacementAdmin />
    </ProtectedRoute>
  )),
},
{
  path: "/offer-coordinator",
  element: titled("Publish job notice", (
    <ProtectedRoute requiredAccess="isCoordinator">
      <OfferCoordinator />
    </ProtectedRoute>
  )),
}
]);

export default router;
