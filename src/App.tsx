import './App.css';
import { ChangeEvent, FormEvent, useState } from 'react';
import {DawnClient, DawnClientEventHandler} from './networking';



const DCEH: DawnClientEventHandler = {
  on_connection: function (connected: boolean): void {
    throw new Error('Function not implemented.');
  },
  on_bad_handshake: function (): void {
    throw new Error('Function not implemented.');
  },
  on_incoming_file: function (contents: String): void {
    throw new Error('Function not implemented.');
  },
  on_conflict: function (): void {
    throw new Error('Function not implemented.');
  },
  on_getoff: function (): void {
    throw new Error('Function not implemented.');
  }
};

const DC = new DawnClient(DCEH);

function Title() {
  const [down, setDown] = useState(false)
  const flip = () => {setDown(!down)};
  return (
    <div className={down ? "title upsidedown" : "title"} onClick={flip}>Dawn Browser</div>
  );
}

function ConnectStuff() {
  const [ip, setIp] = useState("");
  const [pw, setPw] = useState("");
  const handleIpChange = (event: ChangeEvent<HTMLInputElement>) => {setIp(event.target.value)};
  const handlePwChange = (event: ChangeEvent<HTMLInputElement>) => {setPw(event.target.value)};

  function handleConnect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    console.log(`connecting to ${ip}`);
    DC.connect(ip, pw);
  }

  function handleDisconnect() {
    console.log(`disconnecting...`);
    DC.disconnect();
  }

  return (
    <div className='buttonrow'>
      <form onSubmit={handleConnect}>
        <input type="text" value={ip} onChange={handleIpChange}></input>
        <input type="password" value={pw} onChange={handlePwChange}></input>
        <button type="submit">Connect</button>
        <button type="button" onClick={handleDisconnect}>Disconnect</button>
      </form>
    </div>
  );
}


function App() {
  return (
    <div className="App">
      {Title()}
      {ConnectStuff()}
      <div className="buttonrow">
        <button>Upload local file</button>
        <button>Download locally</button>
        <button>Upload from robot</button>
        <button>Push to robot</button>
        <button>Drive</button>
        <button>Stop</button>
      </div>

      <div className="flexy">
        <div className="editor">
          <textarea autoComplete="off" spellCheck="false" defaultValue="print('Hello World!')"></textarea>
        </div>
        <div className="infobox">
          Peripherals: none
        </div>
      </div>
    </div>
  );
}

export default App;