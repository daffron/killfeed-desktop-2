import React, { useState, useEffect, useMemo } from 'react';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
// Removed direct usage of ipcRenderer; using window.api instead.
import ocIcon from '../assets/oc_icon.png?asset';

function generateTopList(data) {
  const topList = Object.keys(data).filter((key) => {
    return data[key] === Math.max(...Object.values(data));
  });
  return {
    topList,
    value: data[topList[0]],
  };
}

function Killfeed() {
  const dirname = window.api.getDirname();

  const [data, setData] = useState('');
  const [lastUpdated, setLastUpdated] = useState(15);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [playerList, setPlayerList] = useState([]);
  const [topTenPlayers, setTopTenPlayers] = useState([]);
  const [squadmates, setSquadmates] = useState([]);
  const [server, setServer] = useState("bigD1");
  const serverOptions = ["bigD1", "bigD2", "chma1", "chma3", "seb"];
  const [overlayEnabled, setOverlayEnabled] = useState(false);

  const handleOverlayToggle = () => {
    setOverlayEnabled(!overlayEnabled);
    window.api.toggleOverlay(!overlayEnabled);
  };

  const [username, setUsername] = useState(() => {
    return window.api.getUserData('username') || 'All Players';
  });

  const usernameReadable = username !== 'All Players' ? decodeURIComponent(username) : '';

  const fetchData = async () => {
    try {
      const params = new URLSearchParams();
      params.append("server", server);
      if (username !== 'All Players') {
        params.append("username", username);
      }
      if (squadmates.length > 0) {
        params.append("squadmates", squadmates.join(','));
      }

      const fullUrl = `https://api.hllkillfeed.com/api/killfeed?${params.toString()}`;
      const res = await fetch(fullUrl);
      const dataRes = await res.json();

      let playerListRes = dataRes.playerList || [];
      if (usernameReadable && !playerListRes.includes(usernameReadable)) {
        playerListRes.push(usernameReadable);
      }

      setData(dataRes.data);
      setLastUpdated(dataRes.lastUpdated);
      setCurrentPlayer(dataRes.currentPlayer);
      setPlayerList(dataRes.playerList || []);
      setTopTenPlayers(dataRes.topTenPlayers || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => {
      fetchData();
    }, 1500);
    return () => clearInterval(timer);
  }, [username, squadmates, server]);

  const parsedData = useMemo(() => {
    if (!data) return [];
    return data;
  }, [data]);

  const handleServerChange = (event) => {
    setServer(event.target.value);
    setSquadmates([]);
  };

  const handleUsernameChange = (newUsername) => {
    setUsername(newUsername);
    window.api.setUserData('username', newUsername);
  };

  const progressWidth = (lastUpdated / 15) * 100;
  const timeUntilReload = 15 - lastUpdated; // Calculate time until next reload

  useEffect(() => {
    // Removed overlay logic
  }, []);

  // Send kill feed data to the main process for the overlay
  useEffect(() => {
    if (overlayEnabled) {
      window.api.sendKillfeedData(parsedData);
    }
  }, [overlayEnabled, parsedData]);

  return (
    <div
      style={{
        background: 'linear-gradient(to bottom, rgba(17,24,39,0) 0px, rgba(17,24,39,1) 150px)'
      }}
      className="min-h-screen text-gray-300 font-sans w-full"
    >
      <main className="flex justify-center pt-6">
        <div className="w-full px-4">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-lg font-bold">Killfeed</h1>
            <label className="flex items-center space-x-2">
              <span className="text-sm">Enable Overlay</span>
              <input
                type="checkbox"
                checked={overlayEnabled}
                onChange={handleOverlayToggle}
                className="form-checkbox h-4 w-4 text-green-500 border-gray-300 rounded"
              />
            </label>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 mb-6 shadow-lg">
            <div className="flex space-x-4 items-center">
              <FormControl style={{ width: '160px' }}>
                <Select
                  value={server}
                  onChange={handleServerChange}
                  sx={{
                    backgroundColor: '#374151',
                    color: '#d1d5db',
                    fontWeight: 'bold',
                    borderRadius: '8px',
                    padding: '8px'
                  }}
                >
                  {serverOptions.map((serverName, index) => (
                    <MenuItem key={index} value={serverName}>
                      {serverName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <Select
                  value={usernameReadable || ''}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  displayEmpty
                  renderValue={(value) => value || 'All Players'}
                  sx={{
                    backgroundColor: '#374151',
                    color: '#d1d5db',
                    fontWeight: 'bold',
                    borderRadius: '8px',
                    padding: '8px'
                  }}
                >
                  <MenuItem value=''>All Players</MenuItem>
                  {playerList.map((player, index) => (
                    <MenuItem key={index} value={player}>
                      {player}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6 mb-6">
            <div className="bg-gray-800 rounded-lg p-6 w-full md:w-1/2 shadow-md">
              {currentPlayer ? (
                <div className="space-y-6">
                  <div className="text-lg font-bold text-center mb-4">
                    Current Player Stats
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-gray-700 p-4 rounded-lg text-center">
                      <p className="text-3xl font-bold text-green-400">{currentPlayer.kills}</p>
                      <p className="text-base">Kills</p>
                    </div>
                    <div className="bg-gray-700 p-4 rounded-lg text-center">
                      <p className="text-3xl font-bold text-red-400">{currentPlayer.deaths}</p>
                      <p className="text-base">Deaths</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <p className="text-base font-semibold">Victim(s):</p>
                      <p className="text-green-400 text-sm">
                        {generateTopList(currentPlayer.most_killed).topList.join(', ')}
                      </p>
                      <p className="text-xs">
                        ({generateTopList(currentPlayer.most_killed).value})
                      </p>
                    </div>
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <p className="text-base font-semibold">Nemesis:</p>
                      <p className="text-red-400 text-sm">
                        {generateTopList(currentPlayer.death_by).topList.join(', ')}
                      </p>
                      <p className="text-xs">
                        ({generateTopList(currentPlayer.death_by).value})
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-base">No current player data</p>
                </div>
              )}
            </div>

            <div className="bg-gray-800 rounded-lg p-6 w-full md:w-1/2 shadow-md">
              {topTenPlayers && topTenPlayers.length > 0 ? (
                <>
                  <p className="text-base font-bold mb-4">Top 10 Kills:</p>
                  <div className="mt-4 space-y-1">
                    {topTenPlayers.map((player, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center text-sm py-0.5 px-1 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="font-semibold text-blue-400">
                            {index + 1}. {player.player}
                          </span>
                          {player.clan === 'OC' && (
                            <img
                              src={ocIcon}
                              alt="OC"
                              className="w-4 h-4 inline-block"
                            />
                          )}
                        </div>
                        <div className="text-right font-semibold text-green-400">
                          {player.kills}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-base">No top players data</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 shadow-md">
            <div className="w-full bg-gray-700 h-0.5 rounded overflow-hidden mb-0.5">
              <div
                className="bg-green-400 h-full transition-all duration-100"
                style={{ width: `${progressWidth}%` }}
                title="Time since last update"
              ></div>
            </div>
            <div className="text-right text-xs text-gray-400 mb-2">
              Next reload in {timeUntilReload}s
            </div>
            <div className="overflow-y-auto max-h-[300px] text-xs space-y-0.5">
              {parsedData.map((item, index) => {
                const verb = item.action === 'killed' ? 'rekt' : 'was rekt by';
                return (
                  <div
                    key={index}
                    className="border-b border-gray-600 py-0.5 px-1 flex items-center justify-between hover:bg-gray-700 transition-colors duration-75 rounded"
                  >
                    <div className="flex items-center space-x-0.5">
                      <span className="text-blue-300 underline font-medium">
                        {item.player}
                      </span>
                      {item.clan === 'OC' && (
                        <img
                          src={ocIcon}
                          alt="OC"
                          className="w-2.5 h-2.5 inline-block"
                        />
                      )}
                      <span className="text-gray-400">{verb}</span>
                      <span className="text-red-300 underline font-medium">
                        {item.opponent}
                      </span>
                      {item.opponentClan === 'OC' && (
                        <img
                          src={ocIcon}
                          alt="OC"
                          className="w-2.5 h-2.5 inline-block"
                        />
                      )}
                    </div>
                    {item.weapon && (
                      <span className="text-green-300 text-xs font-medium">
                        {`with ${item.weapon}`}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Killfeed;
