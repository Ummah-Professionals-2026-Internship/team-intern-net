import {createBrowserRouter} from 'react-router-dom';
import App from "../App";
import MentorApplicationForm from '../pages/MentorApplication/MentorApplicationForm.jsx';


export const router = createBrowserRouter([
    //Mentor Application
    {
    path: "/",
    element: <App />, // Shared layout
    children: [
      {
        path: "prep",
        element: <MentorApplicationForm />,
      },
    ],
  },


]);