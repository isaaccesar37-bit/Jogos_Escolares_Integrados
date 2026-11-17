function collectTeamResults() {
    const teams = ['Azul', 'Amarelo', 'Verde', 'Vermelho'];
    const modalities = ['Dodboll', 'Futsal', 'Peteca', 'Jogos e Brincadeiras', 'Natação', 'Voleibol', 'Tenis de mesa', 'Totó', 'Xadrez', 'Jogos Eletrônicos', 'Oficina de Artes', 'Cubo mágico', 'Batalha Sumo Robótico', 'Torta na Cara', 'Uno', 'Soletrando', 'Quizz'];
    const standings = Object.fromEntries(teams.map(team => [team, {team, points:0, scoreFor:0, played:0, wins:0, draws:0, losses:0}]));
    const pointsByGenderModality = {};
    const completedMatches = gameFixtures.filter(match => {
        const score = gameScores[match.id];
        const teamA = gameParticipants[match.id]?.a || match.teamA;
        const teamB = gameParticipants[match.id]?.b || match.teamB;
        return score && score.a !== undefined && score.b !== undefined &&
            standings[teamA] && standings[teamB] && teamA !== teamB;
    });

    const addModalityPoints = (gender, modality, team, points) => {
        if (!gender || !modalities.includes(modality) || !standings[team]) return;
        const key = `${gender}|${modality}|${team}`;
        pointsByGenderModality[key] = (pointsByGenderModality[key] || 0) + points;
    };

    gameFixtures.forEach(match => {
        const score = gameScores[match.id];
        if (!score || score.a === undefined || score.b === undefined) return;
        const teamA = gameParticipants[match.id]?.a || match.teamA;
        const teamB = gameParticipants[match.id]?.b || match.teamB;
        if (!standings[teamA] || !standings[teamB] || teamA === teamB) return;
        const a = Number(score.a), b = Number(score.b);
        const resultA = standings[teamA], resultB = standings[teamB];
        resultA.played++; resultB.played++;
        resultA.scoreFor += a; resultA.scoreAgainst = (resultA.scoreAgainst || 0) + b;
        resultB.scoreFor += b; resultB.scoreAgainst = (resultB.scoreAgainst || 0) + a;
        let pointsA = 0, pointsB = 0;
        if (a > b) {
            pointsA = 3; resultA.points += 3; resultA.wins++; resultB.losses++;
        } else if (b > a) {
            pointsB = 3; resultB.points += 3; resultB.wins++; resultA.losses++;
        } else {
            pointsA = 1; pointsB = 1;
            resultA.points++; resultB.points++;
            resultA.draws++; resultB.draws++;
        }
        const gender = match.category.includes('Masculino') ? 'Masculino' : match.category.includes('Feminino') ? 'Feminino' : '';
        addModalityPoints(gender, match.sport, teamA, pointsA);
        addModalityPoints(gender, match.sport, teamB, pointsB);
    });

    const ranked = Object.values(standings).sort((a,b) => b.points - a.points || b.scoreFor - a.scoreFor || teams.indexOf(a.team) - teams.indexOf(b.team));
    let position = 0;
    ranked.forEach((team,index) => {
        const previous = ranked[index - 1];
        if (!previous || team.points !== previous.points || team.scoreFor !== previous.scoreFor) position = index + 1;
        team.position = team.played ? position : null;
    });
    return {teams, modalities, standings, ranked, pointsByGenderModality, completedMatches};
}

function renderStatistics() {
    const {teams, modalities, standings, ranked, pointsByGenderModality, completedMatches} = collectTeamResults();
    const colors = {Azul:'#2563eb', Amarelo:'#ca8a04', Verde:'#16a34a', Vermelho:'#dc2626'};
    const teamCounts = teams.map(team => registrations.filter(reg => reg.team === team).length);
    const genderTotals = ['Feminino','Masculino'].map(gender => registrations.filter(reg => reg.gender === gender).length);
    const modalityTotals = modalities.map(modality => registrations.filter(reg => {
        const selected = Array.isArray(reg.modality) ? reg.modality : [reg.modality];
        return selected.includes(modality);
    }).length);
    const maxTeam = Math.max(0, ...teamCounts);
    const maxModality = Math.max(0, ...modalityTotals);
    const teamIndex = teamCounts.indexOf(maxTeam);
    const modalityIndex = modalityTotals.indexOf(maxModality);
    const leader = ranked.find(team => team.played);
    document.getElementById('stats-summary').innerHTML = [
        ['Estudantes inscritos', String(registrations.length)],
        ['Equipe com mais inscritos', registrations.length ? `Equipe ${teams[teamIndex]} · ${maxTeam}` : 'Sem inscrições'],
        ['Líder na classificação', leader ? `Equipe ${leader.team} · ${leader.points} pts` : 'Sem resultados'],
        ['Modalidade mais procurada', maxModality ? `${modalities[modalityIndex]} · ${maxModality}` : 'Sem inscrições'],
        ['Partidas com placar', String(completedMatches.length)]
    ].map(([label,value]) => `<div class="rounded-lg bg-slate-50 border border-slate-200 p-4"><p class="text-xs text-slate-500">${label}</p><p class="text-lg font-bold text-slate-800 mt-1">${value}</p></div>`).join('');

    const pointsPreview = document.getElementById('stats-points-preview');
    pointsPreview.innerHTML = teams.map(team => {
        const result = standings[team];
        const color = colors[team];
        return `<div class="rounded-lg border border-slate-200 bg-slate-50 p-3 flex items-center justify-between gap-2">
            <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full" style="background:${color}"></span><span class="font-semibold text-slate-700">Equipe ${team}</span></div>
            <div class="text-right"><div class="font-bold text-indigo-700">${result.points} pts</div><div class="text-xs text-slate-500">${result.scoreFor} no placar</div></div>
        </div>`;
    }).join('');
    const body = document.getElementById('stats-standings-body');
    const empty = document.getElementById('stats-standings-empty');
    empty.classList.toggle('hidden', ranked.some(team => team.played));
    body.innerHTML = ranked.map(team => `<tr>
        <td class="px-3 py-2 font-semibold">${team.position ?? '—'}</td>
        <td class="px-3 py-2 font-semibold">Equipe ${team.team}</td>
        <td class="px-3 py-2 font-bold text-indigo-700">${team.points}</td>
        <td class="px-3 py-2">${team.played}</td><td class="px-3 py-2">${team.wins}</td>
        <td class="px-3 py-2">${team.draws}</td><td class="px-3 py-2">${team.losses}</td>
        <td class="px-3 py-2">${team.scoreFor}</td>
    </tr>`).join('');

    drawHorizontalBarChart('stats-team-total', teams.map(team => `Equipe ${team}`), [
        {label:'Inscritos', values:teamCounts, itemColors:teams.map(team => colors[team])}
    ], 120);
    drawHorizontalBarChart('stats-team-gender', ['Feminino','Masculino'], [
        {label:'Inscritos', values:genderTotals, itemColors:['#db2777','#2563eb']}
    ], 120);
    ['Masculino','Feminino'].forEach(gender => {
        const id = gender === 'Masculino' ? 'stats-male-modalities' : 'stats-female-modalities';
        drawHorizontalBarChart(id, modalities, teams.map(team => ({
            label:`Equipe ${team}`,
            values:modalities.map(modality => pointsByGenderModality[`${gender}|${modality}|${team}`] || 0),
            color:colors[team]
        })), 165);
    });
}

function drawHorizontalBarChart(canvasId, labels, datasets, labelWidth) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height) return;
    const ratio = window.devicePixelRatio || 1;
    const lightTheme = document.body.classList.contains('theme-light');
    const gridColor = lightTheme ? '#e2e8f0' : '#334155';
    const labelColor = lightTheme ? '#334155' : '#dbe5f2';
    const secondaryLabelColor = lightTheme ? '#64748b' : '#a8b6ca';
    const legendColor = lightTheme ? '#475569' : '#b6c3d6';
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, width, height);
    const top = 34, right = 28, bottom = 20, plotLeft = labelWidth;
    const plotWidth = Math.max(50, width - plotLeft - right), plotHeight = Math.max(1, height - top - bottom);
    const rowHeight = plotHeight / Math.max(1, labels.length);
    const max = Math.max(1, ...datasets.flatMap(dataset => dataset.values));
    const step = Math.max(1, Math.ceil(max / 4));
    ctx.font = '11px Inter, Arial, sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    for (let tick = 0; tick <= max; tick += step) {
        const x = plotLeft + tick / max * plotWidth;
        ctx.strokeStyle = gridColor; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, top + plotHeight); ctx.stroke();
        ctx.fillStyle = secondaryLabelColor; ctx.fillText(String(tick), x, 14);
    }
    labels.forEach((label,row) => {
        const centerY = top + row * rowHeight + rowHeight / 2;
        ctx.fillStyle = labelColor; ctx.textAlign = 'left'; ctx.fillText(label.length > 23 ? `${label.slice(0,21)}…` : label, 0, centerY);
        const barHeight = Math.max(3, Math.min(13, (rowHeight - 4) / datasets.length));
        const totalHeight = datasets.length * barHeight + (datasets.length - 1) * 2;
        const firstY = centerY - totalHeight / 2;
        datasets.forEach((dataset,index) => {
            const value = dataset.values[row] || 0, barWidth = value / max * plotWidth;
            const barY = firstY + index * (barHeight + 2);
            ctx.fillStyle = dataset.itemColors ? dataset.itemColors[row] : dataset.color;
            ctx.fillRect(plotLeft, barY, value ? Math.max(2,barWidth) : 0, barHeight);
            if (value) { ctx.fillStyle = labelColor; ctx.textAlign = 'left'; ctx.fillText(String(value), Math.min(plotLeft + barWidth + 4,width - 18), barY + barHeight / 2); }
        });
    });
    let legendX = plotLeft; ctx.font = '10px Inter, Arial, sans-serif'; ctx.textAlign = 'left';
    datasets.forEach(dataset => {
        ctx.fillStyle = dataset.itemColors ? dataset.itemColors[0] : dataset.color;
        ctx.fillRect(legendX,height - 12,9,9); ctx.fillStyle = legendColor; ctx.fillText(dataset.label,legendX + 13,height - 7);
        legendX += 22 + dataset.label.length * 6;
    });
}

window.addEventListener('resize', () => {
    const pane = document.getElementById('pane-estatisticas');
    if (pane && !pane.classList.contains('hidden')) renderStatistics();
});
