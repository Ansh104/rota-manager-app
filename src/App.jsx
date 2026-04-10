import React, { useMemo, useState } from 'react';

const defaultPeople = ['Gauri', 'Andrii', 'Vitas', 'Swati'];
const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function getNextInRotation(people, current) {
  const idx = people.indexOf(current);
  if (idx === -1 || people.length === 0) return people[0] || '';
  return people[(idx + 1) % people.length];
}

function getMonthDutyPerson(people, monthIndex) {
  if (!people.length) return '';
  return people[monthIndex % people.length];
}

function formatDate(date) {
  return date.toLocaleDateString('en-IE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getNextMonday(fromDate) {
  const date = new Date(fromDate);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay(); // Sun=0, Mon=1
  const daysUntilMonday = day === 1 ? 7 : (8 - day) % 7;
  date.setDate(date.getDate() + daysUntilMonday);
  return date;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function buildFiveWeekSchedule(startMonday, firstSaturdayPerson, people) {
  const weeks = [];
  let saturdayPerson = firstSaturdayPerson;

  for (let weekIndex = 0; weekIndex < 5; weekIndex++) {
    const weekStart = addDays(startMonday, weekIndex * 7);
    const mondayOff = saturdayPerson;
    const monthDutyPerson = getMonthDutyPerson(people, weekStart.getMonth());

    const days = weekdays.map((dayName, dayOffset) => {
      const currentDate = addDays(weekStart, dayOffset);

      if (dayName === 'Monday') {
        return {
          dayName,
          date: currentDate,
          working: people.filter((p) => p !== mondayOff),
          off: [mondayOff],
          saturdayPerson,
          monthlyLead: monthDutyPerson,
        };
      }

      if (dayName === 'Saturday') {
        return {
          dayName,
          date: currentDate,
          working: [saturdayPerson],
          off: people.filter((p) => p !== saturdayPerson),
          saturdayPerson,
          monthlyLead: monthDutyPerson,
        };
      }

      return {
        dayName,
        date: currentDate,
        working: [...people],
        off: [],
        saturdayPerson,
        monthlyLead: monthDutyPerson,
      };
    });

    weeks.push({
      weekNumber: weekIndex + 1,
      label: `Week ${weekIndex + 1}`,
      startDate: weekStart,
      endDate: addDays(weekStart, 5),
      saturdayPerson,
      mondayOff,
      monthlyLead: monthDutyPerson,
      days,
    });

    saturdayPerson = getNextInRotation(people, saturdayPerson);
  }

  return weeks;
}

function escapeCsvValue(value) {
  const stringValue = Array.isArray(value) ? value.join(', ') : String(value ?? '');
  return `"${stringValue.replace(/"/g, '""')}"`;
}

export default function App() {
  const [people, setPeople] = useState(defaultPeople);
  const [firstSaturdayPerson, setFirstSaturdayPerson] = useState('Andrii');
  const [newName, setNewName] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const nextMonday = getNextMonday(new Date());
    return formatDateInputValue(nextMonday);
  });

  const startMonday = useMemo(() => {
    const parsed = new Date(startDate);
    parsed.setHours(0, 0, 0, 0);
    return parsed;
  }, [startDate]);

  const fiveWeeks = useMemo(() => {
    return buildFiveWeekSchedule(startMonday, firstSaturdayPerson, people);
  }, [startMonday, firstSaturdayPerson, people]);

  function addPerson() {
    const trimmed = newName.trim();
    if (!trimmed || people.includes(trimmed)) return;
    setPeople([...people, trimmed]);
    setNewName('');
  }

  function removePerson(name) {
    const updated = people.filter((p) => p !== name);
    setPeople(updated);
    if (firstSaturdayPerson === name) {
      setFirstSaturdayPerson(updated[0] || '');
    }
  }

  function downloadExcel() {
    const rows = [
      [
        'Week',
        'Day',
        'Date',
        'Month',
        'Year',
        'Working',
        'Off',
        'Saturday Person',
        'Monday Off',
        'Monthly 6-Day Lead'
      ]
    ];

    fiveWeeks.forEach((week) => {
      week.days.forEach((day) => {
        rows.push([
          week.label,
          day.dayName,
          formatDate(day.date),
          monthNames[day.date.getMonth()],
          day.date.getFullYear(),
          day.working.join(', '),
          day.off.join(', '),
          week.saturdayPerson,
          week.mondayOff,
          week.monthlyLead
        ]);
      });
    });

    const csvContent = rows
      .map((row) => row.map((cell) => escapeCsvValue(cell)).join(','))
      .join('\\r\\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rota_next_5_weeks_${startDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '8px' }}>Rota Manager</h1>
        <p style={{ color: '#475569', marginBottom: '20px' }}>
          Generates the next 5 weeks with real calendar dates. Saturday rotates weekly, and whoever works Saturday gets Monday off.
        </p>

        <div style={{ ...cardStyle, marginBottom: '20px' }}>
          <h3 style={{ marginTop: 0 }}>Controls</h3>

          <label style={labelStyle}>Start Monday</label>
          <input
            type="date"
            style={inputStyle}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />

          <label style={labelStyle}>First Saturday assigned to</label>
          <select
            style={inputStyle}
            value={firstSaturdayPerson}
            onChange={(e) => setFirstSaturdayPerson(e.target.value)}
          >
            {people.map((person) => (
              <option key={person} value={person}>{person}</option>
            ))}
          </select>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
            <button style={buttonStyle} onClick={downloadExcel}>Download Excel</button>
          </div>
        </div>

        <div style={{ ...cardStyle, marginBottom: '20px' }}>
          <h3 style={{ marginTop: 0 }}>Team</h3>
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

        <div style={{ display: 'grid', gap: '16px' }}>
          {fiveWeeks.map((week) => (
            <div key={week.label} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ margin: 0 }}>{week.label}</h3>
                  <div style={{ color: '#475569', marginTop: '4px' }}>
                    {formatDate(week.startDate)} to {formatDate(week.endDate)}
                  </div>
                </div>

                <div style={{ color: '#334155' }}>
                  <div><strong>Saturday:</strong> {week.saturdayPerson}</div>
                  <div><strong>Monday Off:</strong> {week.mondayOff}</div>
                  <div><strong>Monthly Lead:</strong> {week.monthlyLead}</div>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Day</th>
                      <th style={thStyle}>Date</th>
                      <th style={thStyle}>Working</th>
                      <th style={thStyle}>Off</th>
                      <th style={thStyle}>Monthly Lead</th>
                    </tr>
                  </thead>
                  <tbody>
                    {week.days.map((day) => (
                      <tr key={`${week.label}-${day.dayName}`}>
                        <td style={tdStyle}>{day.dayName}</td>
                        <td style={tdStyle}>{formatDate(day.date)}</td>
                        <td style={tdStyle}>{day.working.join(', ') || 'Nobody'}</td>
                        <td style={tdStyle}>{day.off.join(', ') || 'Nobody'}</td>
                        <td style={tdStyle}>{day.monthlyLead}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
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

const badgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '8px 10px',
  borderRadius: '999px',
  background: '#e2e8f0',
  fontSize: '14px'
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  minWidth: '760px',
};

const thStyle = {
  textAlign: 'left',
  padding: '10px',
  borderBottom: '1px solid #cbd5e1',
  background: '#f8fafc',
};

const tdStyle = {
  padding: '10px',
  borderBottom: '1px solid #e2e8f0',
  verticalAlign: 'top',
};
