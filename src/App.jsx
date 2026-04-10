import React, { useEffect, useMemo, useState } from 'react';

const defaultPeople = ['Gauri', 'Andrii', 'Vitas', 'Swati'];
const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function getMonthDutyPerson(people, monthIndex) {
  if (!people.length) return '';
  return people[monthIndex % people.length];
}

function buildWeekSchedule(people, saturdayPerson, monthDutyPerson) {
  return weekdays.map((day) => {
    if (day === 'Saturday') {
      return {
        day,
        working: saturdayPerson ? [saturdayPerson] : [],
        off: people.filter((p) => p !== saturdayPerson),
      };
    }

    if (day === 'Monday') {
      return {
        day,
        working: people.filter((p) => p !== saturdayPerson),
        off: saturdayPerson ? [saturdayPerson] : [],
      };
    }

    return {
      day,
      working: [...people],
      off: [],
      extraDuty: monthDutyPerson,
    };
  });
}

function getNextInRotation(people, current) {
  const idx = people.indexOf(current);
  if (idx === -1 || people.length === 0) return people[0] || '';
  return people[(idx + 1) % people.length];
}

export default function App() {
  const [people, setPeople] = useState(() => {
    const saved = localStorage.getItem('rota_people');
    return saved ? JSON.parse(saved) : defaultPeople;
  });

  const [currentSaturday, setCurrentSaturday] = useState(() => {
    return localStorage.getItem('rota_currentSaturday') || 'Andrii';
  });

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const saved = localStorage.getItem('rota_selectedMonth');
    return saved ? Number(saved) : new Date().getMonth();
  });

  const [weekLabel, setWeekLabel] = useState(() => {
    return localStorage.getItem('rota_weekLabel') || 'Next Week';
  });

  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('rota_history');
    return saved ? JSON.parse(saved) : [{ week: 'Next Week', saturday: 'Andrii' }];
  });

  const [newName, setNewName] = useState('');
  const [swapA, setSwapA] = useState('');
  const [swapB, setSwapB] = useState('');
  const [scheduleOverride, setScheduleOverride] = useState(null);

  const monthDutyPerson = useMemo(
    () => getMonthDutyPerson(people, selectedMonth),
    [people, selectedMonth]
  );

  const schedule = useMemo(
    () => buildWeekSchedule(people, currentSaturday, monthDutyPerson),
    [people, currentSaturday, monthDutyPerson]
  );

  const displayedSchedule = scheduleOverride || schedule;

  useEffect(() => {
    localStorage.setItem('rota_people', JSON.stringify(people));
    localStorage.setItem('rota_currentSaturday', currentSaturday);
    localStorage.setItem('rota_selectedMonth', String(selectedMonth));
    localStorage.setItem('rota_weekLabel', weekLabel);
    localStorage.setItem('rota_history', JSON.stringify(history));
  }, [people, currentSaturday, selectedMonth, weekLabel, history]);

  const generateNextWeek = () => {
    const next = getNextInRotation(people, currentSaturday);
    const newWeek = `Week ${history.length + 1}`;
    setCurrentSaturday(next);
    setWeekLabel(newWeek);
    setHistory((prev) => [...prev, { week: newWeek, saturday: next }]);
    setScheduleOverride(null);
  };

  const resetWeek = () => {
    setScheduleOverride(null);
  };

  const addPerson = () => {
    const trimmed = newName.trim();
    if (!trimmed || people.includes(trimmed)) return;
    setPeople([...people, trimmed]);
    setNewName('');
  };

  const removePerson = (name) => {
    const updated = people.filter((p) => p !== name);
    setPeople(updated);
    if (currentSaturday === name) {
      setCurrentSaturday(updated[0] || '');
    }
    setScheduleOverride(null);
  };

  const swapPeople = () => {
    if (!swapA || !swapB || swapA === swapB) return;

    const clone = structuredClone(displayedSchedule);
    clone.forEach((entry) => {
      entry.working = entry.working.map((p) => (p === swapA ? swapB : p === swapB ? swapA : p));
      entry.off = entry.off.map((p) => (p === swapA ? swapB : p === swapB ? swapA : p));
      if (entry.extraDuty === swapA) entry.extraDuty = swapB;
      else if (entry.extraDuty === swapB) entry.extraDuty = swapA;
    });

    setScheduleOverride(clone);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '8px' }}>Rota Manager</h1>
        <p style={{ color: '#475569', marginBottom: '24px' }}>
          Saturday rotates weekly. Whoever works Saturday gets Monday off. Every month one person is the 6-day lead.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={cardStyle}>
              <h3>Controls</h3>

              <label style={labelStyle}>Week label</label>
              <input style={inputStyle} value={weekLabel} onChange={(e) => setWeekLabel(e.target.value)} />

              <label style={labelStyle}>Saturday assigned to</label>
              <select style={inputStyle} value={currentSaturday} onChange={(e) => { setCurrentSaturday(e.target.value); setScheduleOverride(null); }}>
                {people.map((person) => (
                  <option key={person} value={person}>{person}</option>
                ))}
              </select>

              <label style={labelStyle}>Month</label>
              <select style={inputStyle} value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
                {monthNames.map((month, idx) => (
                  <option key={month} value={idx}>{month}</option>
                ))}
              </select>

              <div style={{ marginTop: '12px', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '10px', background: '#fff' }}>
                <div style={{ fontSize: '14px', color: '#475569' }}>Monthly 6-day lead</div>
                <div style={{ fontSize: '20px', fontWeight: '700', marginTop: '4px' }}>{monthDutyPerson}</div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                <button style={buttonStyle} onClick={generateNextWeek}>Generate next week</button>
                <button style={buttonSecondary} onClick={resetWeek}>Reset</button>
              </div>
            </div>

            <div style={cardStyle}>
              <h3>Swap people</h3>
              <select style={inputStyle} value={swapA} onChange={(e) => setSwapA(e.target.value)}>
                <option value="">First person</option>
                {people.map((person) => <option key={person} value={person}>{person}</option>)}
              </select>

              <select style={inputStyle} value={swapB} onChange={(e) => setSwapB(e.target.value)}>
                <option value="">Second person</option>
                {people.map((person) => <option key={person} value={person}>{person}</option>)}
              </select>

              <button style={{ ...buttonStyle, marginTop: '10px', width: '100%' }} onClick={swapPeople}>
                Swap this week
              </button>
            </div>

            <div style={cardStyle}>
              <h3>Team</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  style={inputStyle}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Add team member"
                />
                <button style={buttonStyle} onClick={addPerson}>Add</button>
              </div>

              <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {people.map((person) => (
                  <div key={person} style={badgeStyle}>
                    {person}
                    <button
                      onClick={() => removePerson(person)}
                      style={{ marginLeft: '8px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#991b1b' }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={cardStyle}>
              <h3>{weekLabel} Schedule</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                {displayedSchedule.map((entry) => (
                  <div key={entry.day} style={{ border: '1px solid #cbd5e1', borderRadius: '12px', padding: '14px', background: '#fff' }}>
                    <div style={{ fontWeight: '700', marginBottom: '10px' }}>{entry.day}</div>

                    <div style={{ fontSize: '14px', color: '#475569' }}>Working</div>
                    <div style={{ marginBottom: '10px' }}>{entry.working.join(', ')}</div>

                    <div style={{ fontSize: '14px', color: '#475569' }}>Off</div>
                    <div style={{ marginBottom: '10px' }}>{entry.off.length ? entry.off.join(', ') : 'Nobody'}</div>

                    {entry.extraDuty ? (
                      <>
                        <div style={{ fontSize: '14px', color: '#475569' }}>Monthly 6-day lead</div>
                        <div>{entry.extraDuty}</div>
                      </>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div style={cardStyle}>
              <h3>Rotation history</h3>
              <div style={{ display: 'grid', gap: '8px' }}>
                {history.map((item, idx) => (
                  <div key={`${item.week}-${idx}`} style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px', background: '#fff' }}>
                    <strong>{item.week}</strong> — Saturday: {item.saturday}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const cardStyle = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '16px',
  padding: '16px',
};

const inputStyle = {
  width: '100%',
  padding: '10px',
  borderRadius: '10px',
  border: '1px solid #cbd5e1',
  marginTop: '6px',
  marginBottom: '12px',
  boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block',
  fontSize: '14px',
  color: '#475569',
  marginTop: '8px',
};

const buttonStyle = {
  padding: '10px 14px',
  borderRadius: '10px',
  border: 'none',
  background: '#0f172a',
  color: '#fff',
  cursor: 'pointer',
};

const buttonSecondary = {
  padding: '10px 14px',
  borderRadius: '10px',
  border: '1px solid #cbd5e1',
  background: '#fff',
  color: '#0f172a',
  cursor: 'pointer',
};

const badgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '8px 10px',
  borderRadius: '999px',
  background: '#e2e8f0',
  fontSize: '14px',
};
