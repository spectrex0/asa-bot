export default async function sendRequest() {
  try {
    // this shit  is for sending a request to 
    // my coders resources backend to make it more fast and alive 24/7
    const response = await fetch('https://codersresources-backend.onrender.com', {
      method: "GET"
    });
    if (!response.ok) {
      return {
        message: "Something went wrong while sending the request"
      };
    }
    return {
      message: "Coders Resources backend Bumped 🙌✔"
    };
  } catch (error) {
    return {
      message: "Something went wrong while sending the request :<"
    };
  }
}

sendRequest().then(console.log);