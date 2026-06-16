// api.js will be used to manage Web APIs, bundle functions, external data communication
import axios from 'axios';

const api = axios.create({
    baseURL: "https://localhost:8000"
});
