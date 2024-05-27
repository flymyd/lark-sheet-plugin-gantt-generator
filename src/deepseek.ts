import axios from "axios";

export const deepSeekChat = (messages: any) => {
  const DEEPSEEK_API_KEY = 'TO_BE_FILLED';
  const ENDPOINT_URL = 'https://api.deepseek.com/chat/completions';
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
  };
  const data = {
    "model": "deepseek-chat",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": messages}
    ],
    "stream": false
  };
  return axios.post(ENDPOINT_URL, data, {headers});
};
