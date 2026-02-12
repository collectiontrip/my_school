import  { jwtDecode }  from "jwt-decode";


const getUsetFromToken = () => {
    const token = localStorage.getItem("accessToken");

    if(!token) return null;

    try {
        return jwtDecode(token);
    } catch (e) {
        return null;
    }
};


export default getUsetFromToken;