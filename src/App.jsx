import React, { useMemo, useState } from 'react';

const defaultPeople = ['Gauri', 'Andrii', 'Vitas', 'Swati'];
const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function addDays(date, days) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
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

function escapeCsvValue(value) {
  const stringValue = Array.isArray(value) ? value.join(', ') : String(value ?? '');
  return `"${stringValue.replace(/"/g, '""')}"`;
}

function getMonthDutyPerson(people, monthIndex) {
  if (!people.length) return '';
  return people[monthIndex % people.length];
}

function buildWeek({
  weekNumber,
  weekStartDate,
  saturdayPerson,
  previousWeekSaturdayPerson,
  people,
  overrides
}) {
  const monthDutyPerson = getMonthDutyPerson(people, weekStartDate.getMonth());

  const days = weekdays.map((dayName, dayOffset) => {
    const currentDate = addDays(weekStartDate, dayOffset);
    const override = overrides?.[dayName] || {};

    let working = [...people];
    let off = [];

    if (dayName === 'Monday') {
      off = previousWeekSaturdayPerson ? [previousWeekSaturdayPerson] : [];
      working = previousWeekSaturdayPerson
        ? people.filter((p) => p !== previousWeekSaturdayPerson)
        : [...people];
    } else if (dayName === 'Saturday') {
      working = saturdayPerson ? [saturdayPerson] : [];
      off = people.filter((p) => p !== saturdayPerson);
    }

    if (override.workingText !== undefined) {
      working = override.workingText
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
    }

    if (override.offText !== undefined) {
      off = override.offText
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
    }

    return {
      dayName,
      date: currentDate,
      working,
      off,
      monthlyLead: monthDutyPerson,
    };
  });

  return {
    weekNumber,
    label: `Week ${weekNumber}`,
    startDate: weekStartDate,
    endDate: addDays(weekStartDate, 5),
    saturdayPerson,
    mondayOff: previousWeekSaturdayPerson || '',
    monthlyLead: monthDutyPerson,
    days,
  };
}

export default function App() {
  const [people, setPeople] = useState(defaultPeople);
  const [newName, setNewName] = useState('');
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [startMonday, setStartMonday] = useState(() =>
    formatDateInputValue(getNextMonday(new Date()))
  );

  const [weekConfigs, setWeekConfigs] = useState([
    { saturdayPerson: 'Andrii', previousWeekSaturdayPerson: '', overrides: {} },
    { saturdayPerson: 'Vitas', previousWeekSaturdayPerson: 'Andrii', overrides: {} },
    { saturdayPerson: 'Swati', previousWeekSaturdayPerson: 'Vitas', overrides: {} },
    { saturdayPerson: 'Gauri', previousWeekSaturdayPerson: 'Swati', overrides: {} },
    { saturdayPerson: 'Andrii', previousWeekSaturdayPerson: 'Gauri', overrides: {} },
  ]);

  const parsedStartMonday = useMemo(() => {
    const d = new Date(startMonday);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [startMonday]);

  const fiveWeeks = useMemo(() => {
    return weekConfigs.map((config, index) =>
      buildWeek({
        weekNumber: index + 1,
        weekStartDate: addDays(parsedStartMonday, index * 7),
        saturdayPerson: config.saturdayPerson,
        previousWeekSaturdayPerson: config.previousWeekSaturdayPerson,
        people,
        overrides: config.overrides || {},
      })
    );
  }, [weekConfigs, parsedStartMonday, people]);

  const currentWeekConfig = weekConfigs[selectedWeek - 1];
  const currentWeekData = fiveWeeks[selectedWeek - 1];

  function updateWeekConfig(weekNumber, key, value) {
    setWeekConfigs((prev) =>
      prev.map((week, idx) =>
        idx === weekNumber - 1 ? { ...week, [key]: value } : week
      )
    );
  }

  function updateDayOverride(weekNumber, dayName, field, value) {
    setWeekConfigs((prev) =>
      prev.map((week, idx) => {
        if (idx !== weekNumber - 1) return week;

        return {
          ...week,
          overrides: {
            ...(week.overrides || {}),
            [dayName]: {
              ...((week.overrides || {})[dayName] || {}),
              [field]: value,
            },
          },
        };
      })
    );
  }

  function clearDayOverride(weekNumber, dayName) {
    setWeekConfigs((prev) =>
      prev.map((week, idx) => {
        if (idx !== weekNumber - 1) return week;
        const nextOverrides = { ...(week.overrides || {}) };
        delete nextOverrides[dayName];
        return { ...week, overrides: nextOverrides };
      })
    );
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

    setWeekConfigs((prev) =>
      prev.map((week) => ({
        ...week,
        saturdayPerson: week.saturdayPerson === name ? (updated[0] || '') : week.saturdayPerson,
        previousWeekSaturdayPerson:
          week.previousWeekSaturdayPerson === name ? '' : week.previousWeekSaturdayPerson,
      }))
    );
  }

  function autoFillRotationFromWeek1() {
    setWeekConfigs((prev) => {
      const firstSaturday = prev[0].saturdayPerson;
      if (!firstSaturday) return prev;

      const firstIdx = people.indexOf(firstSaturday);
      if (firstIdx === -1) return prev;

      return prev.map((week, idx) => {
        const saturdayPerson = people[(firstIdx + idx) % people.length];
        const previousWeekSaturdayPerson = idx === 0 ? prev[0].previousWeekSaturdayPerson : people[(firstIdx + idx - 1 + people.length) % people.length];
        return {
          ...week,
          saturdayPerson,
          previousWeekSaturdayPerson,
        };
      });
    });
  }

  function downloadExcel() {
    const rows = [[
      'Week',
      'Week Start',
      'Week End',
      'Day',
      'Date',
      'Month',
      'Year',
      'Working',
      'Off',
      'Saturday Person',
      'Previous Week Saturday Person',
      'Monday Off',
      'Monthly 6-Day Lead'
    ]];

    fiveWeeks.forEach((week) => {
      week.days.forEach((day) => {
        rows.push([
          week.label,
          formatDate(week.startDate),
          formatDate(week.endDate),
          day.dayName,
          formatDate(day.date),
          monthNames[day.date.getMonth()],
          day.date.getFullYear(),
          day.working.join(', '),
          day.off.join(', '),
          week.saturdayPerson,
          week.mondayOff,
          week.mondayOff,
          week.monthlyLead,
        ]);
      });
    });

    const csvContent = rows
      .map((row) => row.map((cell) => escapeCsvValue(cell)).join(','))
      .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'rota_next_5_weeks.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '8px' }}>Rota Manager</h1>
        <p style={{ color: '#475569', marginBottom: '20px' }}>
          5 weeks rota with real dates, week selection, previous-week Saturday tracking, Monday off logic, manual overrides, and Excel download.
        </p>

        <div style={{ ...cardStyle, marginBottom: '20px' }}>
          <h3 style={{ marginTop: 0 }}>Main Controls</h3>

          <label style={labelStyle}>Start Monday for Week 1</label>
          <input
            type="date"
            style={inputStyle}
            value={startMonday}
            onChange={(e) => setStartMonday(e.target.value)}
          />

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
            <button style={buttonStyle} onClick={autoFillRotationFromWeek1}>Auto Fill Rotation</button>
            <button style={buttonStyle} onClick={downloadExcel}>Download Excel</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
          <div style={{ display: 'grid', gap: '20px' }}>
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0 }}>Select Week</h3>
              <select
                style={inputStyle}
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5].map((weekNo) => (
                  <option key={weekNo} value={weekNo}>{`Week ${weekNo}`}</option>
                ))}
              </select>

              <label style={labelStyle}>Saturday person for Week {selectedWeek}</label>
              <select
                style={inputStyle}
                value={currentWeekConfig.saturdayPerson}
                onChange={(e) => updateWeekConfig(selectedWeek, 'saturdayPerson', e.target.value)}
              >
                {people.map((person) => (
                  <option key={person} value={person}>{person}</option>
                ))}
              </select>

              <label style={labelStyle}>Who worked previous week's Saturday?</label>
              <select
                style={inputStyle}
                value={currentWeekConfig.previousWeekSaturdayPerson}
                onChange={(e) => updateWeekConfig(selectedWeek, 'previousWeekSaturdayPerson', e.target.value)}
              >
                <option value="">None</option>
                {people.map((person) => (
                  <option key={person} value={person}>{person}</option>
                ))}
              </select>

              <div style={infoBoxStyle}>
                <div><strong>Week:</strong> {currentWeekData.label}</div>
                <div><strong>Dates:</strong> {formatDate(currentWeekData.startDate)} to {formatDate(currentWeekData.endDate)}</div>
                <div><strong>Saturday:</strong> {currentWeekData.saturdayPerson}</div>
                <div><strong>Monday Off:</strong> {currentWeekData.mondayOff || 'None'}</div>
                <div><strong>Monthly Lead:</strong> {currentWeekData.monthlyLead}</div>
              </div>
            </div>

            <div style={cardStyle}>
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

            <div style={cardStyle}>
              <h3 style={{ marginTop: 0 }}>Week-wise Saturday Summary</h3>
              <div style={{ display: 'grid', gap: '8px' }}>
                {fiveWeeks.map((week) => (
                  <div key={week.label} style={historyItemStyle}>
                    <strong>{week.label}</strong> — Saturday: {week.saturdayPerson} — Monday Off: {week.mondayOff || 'None'}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '20px' }}>
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0 }}>{currentWeekData.label} Calendar</h3>
              <div style={{ color: '#475569', marginBottom: '12px' }}>
                {formatDate(currentWeekData.startDate)} to {formatDate(currentWeekData.endDate)}
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Day</th>
                      <th style={thStyle}>Date</th>
                      <th style={thStyle}>Working</th>
                      <th style={thStyle}>Off</th>
                      <th style={thStyle}>Override</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentWeekData.days.map((day) => {
                      const override = currentWeekConfig.overrides?.[day.dayName] || {};
                      return (
                        <tr key={day.dayName}>
                          <td style={tdStyle}>{day.dayName}</td>
                          <td style={tdStyle}>{formatDate(day.date)}</td>
                          <td style={tdStyle}>{day.working.join(', ') || 'Nobody'}</td>
                          <td style={tdStyle}>{day.off.join(', ') || 'Nobody'}</td>
                          <td style={tdStyle}>
                            <div style={{ display: 'grid', gap: '8px', minWidth: '260px' }}>
                              <input
                                style={smallInputStyle}
                                placeholder="Working override, comma separated"
                                value={override.workingText || ''}
                                onChange={(e) =>
                                  updateDayOverride(selectedWeek, day.dayName, 'workingText', e.target.value)
                                }
                              />
                              <input
                                style={smallInputStyle}
                                placeholder="Off override, comma separated"
                                value={override.offText || ''}
                                onChange={(e) =>
                                  updateDayOverride(selectedWeek, day.dayName, 'offText', e.target.value)
                                }
                              />
                              <button
                                style={buttonSecondary}
                                onClick={() => clearDayOverride(selectedWeek, day.dayName)}
                              >
                                Clear override
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={cardStyle}>
              <h3 style={{ marginTop: 0 }}>All 5 Weeks Overview</h3>
              <div style={{ display: 'grid', gap: '16px' }}>
                {fiveWeeks.map((week) => (
                  <div key={week.label} style={{ border: '1px solid #cbd5e1', borderRadius: '12px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                      <div>
                        <strong>{week.label}</strong>
                        <div style={{ color: '#475569', marginTop: '4px' }}>
                          {formatDate(week.startDate)} to {formatDate(week.endDate)}
                        </div>
                      </div>
                      <div>
                        <div><strong>Saturday:</strong> {week.saturdayPerson}</div>
                        <div><strong>Monday Off:</strong> {week.mondayOff || 'None'}</div>
                      </div>
                    </div>
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

const smallInputStyle = {
  width: '100%',
  padding: '8px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
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
  padding: '8px 10px',
  borderRadius: '8px',
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

const historyItemStyle = {
  border: '1px solid #cbd5e1',
  borderRadius: '10px',
  padding: '10px',
  background: '#fff'
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  minWidth: '980px',
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
