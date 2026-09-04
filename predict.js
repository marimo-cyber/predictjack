const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function formatDate(date) {
  const offset = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - offset);
  return localDate.toISOString().split('T')[0];
}

app.get('/api/predict', async (req, res) => {
  try {
    const today = new Date();
    const targetDates = [];

    for (let i = 3; i >= 1; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      targetDates.push(formatDate(d));
    }

    const { data: dbData, error } = await supabase
      .from('menus')
      .select('date, menu')
      .in('date', targetDates)
      .order('date', { ascending: true });

    if (error) throw error;

    const pastMenus = targetDates.map(dateStr => {
      const found = dbData.find(item => item.date === dateStr);
      const d = new Date(dateStr);
      const dayName = d.toLocaleDateString('ko-KR', { weekday: 'short' });

      return {
        date: dateStr,
        day: dayName,
        menu: found ? found.menu : '식단 데이터 없음'
      };
    });

    const { data: allMenus } = await supabase.from('menus').select('menu');
    let predictedMenu = '데이터 부족으로 예측 불가';

    if (allMenus && allMenus.length > 0) {
      const randomIndex = Math.floor(Math.random() * allMenus.length);
      predictedMenu = allMenus[randomIndex].menu;
    }

    res.json({
      success: true,
      today: formatDate(today),
      pastMenus: pastMenus,
      prediction: predictedMenu
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = app;