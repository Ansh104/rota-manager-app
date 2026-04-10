import React, { useMemo, useState } from 'react';

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

function escapeCsvValue(value) {
  const stringValue = Array.isArray(value) ? value.join(', ') : String(value ?? '');
  return `"${stringValue.replace(/"/g, '""')}"`;
}

export default function App() {
  const [people, setPeople] = useState(defaultPeople);
  const [currentSaturday, setCurrentSaturday] = useState('Andrii');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [weekLabel, setWeekLabel] = useState('Next Week');
  const [newName, setNewName] = useState('');
  const [swapA, setSwapA] = useState('');
  const [swapB, setSwapB] = useState('');
  const [history, setHistory] = useState([{ week: 'Next Week', saturday: 'Andrii' }]);
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
  const mondayOff = currentSaturday;

  function generateNextWeek() {
    const next = getNextInRotation(people, currentSaturday);
    const newWeek = `Week ${history.length + 1}`;
    setCurrentSaturday(next);
    setWeekLabel(newWeek);
    setHistory((prev) => [...prev, { week: newWeek, saturday: next }]);
    setScheduleOverride(null);
    setSwapA('');
    setSwapB('');
  }

  function resetWeek() {
    setScheduleOverride(null);
    setSwapA('');
    setSwapB('');
  }

  function addPerson() {
    const trimmed = newName.trim();
    if (!trimmed || people.includes(trimmed)) return;
    setPeople([...people, trimmed]);
    setNewName('');
  }

  function removePerson(name) {
    const updated = people.filter((p) => p !== name);
    setPeople(updated);
    if (currentSaturday === name) {
      setCurrentSaturday(updated[0] || '');
    }
    setScheduleOverride(null);
  }

  function swapPeople() {
    if (!swapA || !swapB || swapA === swapB) return;

    const clone = JSON.parse(JSON.stringify(displayedSchedule));
    clone.forEach((entry) => {
      entry.working = entry.working.map((p) => (p === swapA ? swapB : p === swapB ? swapA : p));
      entry.off = entry.off.map((p) => (p === swapA ? swapB : p === swapB ? swapA : p));
      if (entry.extraDuty === swapA) entry.extraDuty = swapB;
      else if (entry.extraDuty === swapB) entry.extraDuty = swapA;
    });

    setScheduleOverride(clone);
  }

  function downloadExcel() {
    const rows = [
      [
        'Week',
        'Month',
        'Year',
        'Day',
        'Working',
        'Off',
        'Saturday Person',
        'Monday Off',
        'Monthly 6-Day Lead',
        'Swap Person 1',
        'Swap Person 2'
      ],
      ...displayedSchedule.map((entry) => [
        weekLabel,
        monthNames[selectedMonth],
        selectedYear,
        entry.day,
        entry.working.join(', '),
        entry.off.join(', '),
        currentSaturday,
        mondayOff,
        entry.extraDuty || '',
        swapA,
        swapB
      ])
    ];

    const csvContent = rows
      .map((row) => row.map((cell) => escapeCsvValue(cell)).join(','))
      .join('\\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeWeek = weekLabel.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const safeMonth = monthNames[selectedMonth].toLowerCase();
    link.href = url;
    link.download = `rota_${safeWeek}_${safeMonth}_${selectedYear}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1>Rota Manager</h1>
        <p style={{ color: '#475569' }}>
          Saturday rotates weekly. Whoever works Saturday gets Monday off. One person is monthly 6-day lead.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
          <div style={cardStyle}>
            <h3>Controls</h3>

            <label style={labelStyle}>Week label</label>
            <input style={inputStyle} value={weekLabel} onChange={(e) => setWeekLabel(e.target.value)} />

            <label style={labelStyle}>Saturday assigned to</label>
            <select style={inputStyle} value={currentSaturday} onChange={(e) => setCurrentSaturday(e.target.value)}>
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

            <label style={labelStyle}>Year</label>
            <input
              style={inputStyle}
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value) || new Date().getFullYear())}
            />

            <div style={infoBoxStyle}>
              <div><strong>Monday Off:</strong> {mondayOff}</div>
              <div style={{ marginTop: '6px' }}><strong>Monthly 6-day lead:</strong> {monthDutyPerson}</div>
            </div>

            <label style={labelStyle}>Swap Person 1</label>
            <select style={inputStyle} value={swapA} onChange={(e) => setSwapA(e.target.value)}>
              <option value="">Select person</option>
              {people.map((person) => (
                <option key={person} value={person}>{person}</option>
              ))}
            </select>

            <label style={labelStyle}>Swap Person 2</label>
            <select style={inputStyle} value={swapB} onChange={(e) => setSwapB(e.target.value)}>
              <option value="">Select person</option>
              {people.map((person) => (
                <option key={person} value={person}>{person}</option>
              ))}
            </select>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
              <button style={buttonStyle} onClick={generateNextWeek}>Generate next week</button>
              <button style={buttonStyle} onClick={swapPeople}>Apply Swap</button>
              <button style={buttonStyle} onClick={downloadExcel}>Download Excel</button>
              <button style={buttonSecondary} onClick={resetWeek}>Reset</button>
            </div>
          </div>

          <div style={cardStyle}>
            <h3>{weekLabel} Schedule</h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              {displayedSchedule.map((entry) => (
                <div key={entry.day} style={dayCardStyle}>
                  <div style={{ fontWeight: '700', marginBottom: '10px' }}>{entry.day}</div>
                  <div><strong>Working:</strong> {entry.working.join(', ') || 'Nobody'}</div>
                  <div style={{ marginTop: '8px' }}><strong>Off:</strong> {entry.off.join(', ') || 'Nobody'}</div>
                  {entry.extraDuty ? (
                    <div style={{ marginTop: '8px' }}><strong>Monthly lead:</strong> {entry.extraDuty}</div>
                  ) : null}
                </div>
              ))}
            </div>

            <h3 style={{ marginTop: '24px' }}>Rotation History</h3>
            <div style={{ display: 'grid', gap: '8px' }}>
              {history.map((item, idx) => (
                <div key={idx} style={historyItemStyle}>
                  <strong>{item.week}</strong> — Saturday: {item.saturday}
                </div>
              ))}
            </div>

            <h3 style={{ marginTop: '24px' }}>Team</h3>
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
                    style={{
                      marginLeft: '8px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      color: '#991b1b',
                      fontSize: '16px'
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
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

const dayCardStyle = {
  border: '1px solid #cbd5e1',
  borderRadius: '12px',
  padding: '14px',
  background: '#fff'
};

const historyItemStyle = {
  border: '1px solid #cbd5e1',
  borderRadius: '10px',
  padding: '10px',
  background: '#fff'
};

const infoBoxStyle = {
  marginTop: '12px',
  padding: '12px',
  border: '1px solid #cbd5e1',
  borderRadius: '10px',
  background: '#fff',
  marginBottom: '12px'
};

const inputStyle = {
  width: '100%',
  padding: '10px',
  borderRadius: '10px',
  border: '1px solid #cbd5e1',
  marginTop: '6px',
  marginBottom: '12px',
  boxSizing: 'border-box',
  background: '#fff'
};

const labelStyle = {
  display: 'block',
  fontSize: '14px',
  color: '#475569',
  marginTop: '8px'
};

const buttonStyle = {
  padding: '10px 14px',
  borderRadius: '10px',
  border: 'none',
  background: '#0f172a',
  color: '#fff',
  cursor: 'pointer'
};

const buttonSecondary = {
  padding: '10px 14px',
  borderRadius: '10px',
  border: '1px solid #cbd5e1',
  background: '#fff',
  color: '#0f172a',
  cursor: 'pointer'
};

const badgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '8px 10px',
  borderRadius: '999px',
  background: '#e2e8f0',
  fontSize: '14px'
};
