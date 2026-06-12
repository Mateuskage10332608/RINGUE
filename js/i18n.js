// ============================================================
// RINGUE — Internacionalização (PT / EN)
// DOM-walker approach: translate after each screen render.
// Portuguese is default; English entries override when active.
// ============================================================

(function () {
  let _lang = localStorage.getItem('ringue_lang') || 'pt';

  // ──────────────────────────────────────────────────────────
  // English dictionary  (key = exact Portuguese text node)
  // ──────────────────────────────────────────────────────────
  const LANG_EN = {

    // ── Global / Navigation ────────────────────────────────
    '← Voltar': '← Back',
    '← Menu': '← Menu',
    '← Menu Principal': '← Main Menu',
    'Salvar': 'Save',
    'Fechar': 'Close',
    'Sim': 'Yes',
    'Não': 'No',

    // ── Create Athlete (missing) ────────────────────────────
    'Apelido (opcional)': 'Nickname (optional)',
    'Idade': 'Age',
    'Nacionalidade': 'Nationality',
    'Atributos': 'Attributes',
    'pts restantes': 'pts remaining',
    'até': 'up to',
    'Base: 55. Distribua 20 pontos ou use um preset abaixo.': 'Base: 55. Distribute 20 points or use a preset below.',
    '⚡ Físico': '⚡ Physical',
    '🥊 Técnico': '🥊 Technical',
    '🧠 Mental': '🧠 Mental',
    '🧠 Técnico': '🧠 Technical',

    // ── Fighting style descriptions ─────────────────────────
    'Pressão constante, encurrala o adversário': 'Constant pressure, corners the opponent',
    'Mantém distância, pontua com jab': 'Keeps distance, scores with jab',
    'Espera o erro do adversário e pune': 'Waits for the opponent\'s mistake and punishes',
    'Trocação pura, KO poder': 'Pure brawling, KO power',
    'Volume de golpes, desgaste': 'Punch volume, attrition',
    'Técnica apurada, controle da luta': 'Sharp technique, fight control',
    'Equilíbrio entre técnica e potência': 'Balance of technique and power',
    'Boxeador Técnico': 'Technical Boxer',
    'Seu estilo e personalidade se reforçam no ringue.': 'Your style and personality reinforce each other in the ring.',

    // ── Main Menu ──────────────────────────────────────────
    'Simulador de Boxe Gerencial': 'Boxing Management Simulator',
    'Vazio': 'Empty',
    'Novo Jogo →': 'New Game →',
    'Sobre o Jogo': 'About',
    'Carregando RINGUE...': 'Loading RINGUE...',

    // ── About modal ────────────────────────────────────────
    'Sobre o RINGUE': 'About RINGUE',
    'Gerencie a carreira de um atleta: treine, escolha lutas, construa um legado.': 'Manage an athlete\'s career: train, choose fights, build a legacy.',

    // ── Mode Select ────────────────────────────────────────
    'Escolha o Modo de Jogo': 'Choose Game Mode',
    'Carreira de Atleta': 'Athlete Career',
    'Manager de Academia': 'Academy Manager',
    'Dono de Federação': 'Federation Owner',
    'Controle a carreira de um boxeador desde o início até a glória ou decadência.': 'Control a boxer\'s career from humble beginnings to glory or decline.',
    'Gerencie uma academia, forme campeões e construa uma dinastia.': 'Manage a gym, develop champions and build a dynasty.',
    'Administre uma federação, controle rankings, cinturões e o futuro do esporte.': 'Run a federation, control rankings, belts and the future of the sport.',
    'Em breve': 'Coming Soon',
    'Disponível': 'Available',

    // ── Create Athlete ─────────────────────────────────────
    'Criar Atleta': 'Create Athlete',
    'Nome': 'First Name',
    'Sobrenome': 'Last Name',
    'Apelido': 'Nickname',
    'País / Origem': 'Country / Origin',
    'Categoria de Peso': 'Weight Class',
    'Estilo de Luta': 'Fighting Style',
    'Personalidade': 'Personality',
    'Distribuição de Atributos': 'Attribute Distribution',
    'Pontos restantes': 'Points remaining',
    'Criar Lutador →': 'Create Fighter →',
    'Preview do Atleta': 'Fighter Preview',
    'Nome completo': 'Full name',
    'Cartel inicial': 'Starting record',
    'Potencial estimado': 'Estimated potential',
    'Estilo:': 'Style:',

    // ── Attribute groups ────────────────────────────────────
    'Físico': 'Physical',
    'Técnico': 'Technical',
    'Mental': 'Mental',
    'Habilidade': 'Skill',

    // ── Attribute names (full) ─────────────────────────────
    'Força': 'Strength',
    'Velocidade': 'Speed',
    'Resistência': 'Stamina',
    'Queixo': 'Chin',
    'Defesa': 'Defense',
    'Jab': 'Jab',
    'Ring IQ': 'Ring IQ',
    'Coragem': 'Courage',
    'Reflexos': 'Reflexes',
    'Footwork': 'Footwork',
    'Combinações': 'Combinations',
    'Precisão': 'Precision',
    'Equilíbrio': 'Composure',
    'Resiliência': 'Resilience',
    'Soco no Corpo': 'Body Punch',
    'Contra-ataque': 'Counter',
    'Distância': 'Distance',
    'Clinch': 'Clinch',
    'Direto': 'Straight',

    // ── Weight Classes ─────────────────────────────────────
    'Peso Mínimo': 'Minimumweight',
    'Peso Mosca': 'Flyweight',
    'Peso Galo': 'Bantamweight',
    'Peso Pena': 'Featherweight',
    'Peso Leve': 'Lightweight',
    'Super-Leve': 'Super Lightweight',
    'Peso Meio-Médio': 'Welterweight',
    'Peso Médio': 'Middleweight',
    'Super Peso Médio': 'Super Middleweight',
    'Meio-Pesado': 'Light Heavyweight',
    'Peso Cruzeiro': 'Cruiserweight',
    'Peso Pesado': 'Heavyweight',

    // ── Career Hub ─────────────────────────────────────────
    'Próximos Passos': 'Next Steps',
    'Gestão': 'Management',
    'Consultar': 'Browse',
    'Treinar': 'Train',
    'Melhorar atributos antes da próxima luta': 'Improve attributes before your next fight',
    'Escolher Luta': 'Choose Fight',
    'Continuar Luta Marcada': 'Continue Scheduled Fight',
    'Desafios Recebidos': 'Incoming Challenges',
    'Equipe': 'Team',
    'Contratos e Promotores': 'Contracts & Promoters',
    'Livre para negociar': 'Free to negotiate',
    'Mudar de Divisão': 'Change Division',
    'categorias adjacentes': 'adjacent categories',
    'Investimentos': 'Investments',
    'Rankings': 'Rankings',
    'Ficha do Atleta': 'Fighter Profile',
    'Rivalidades': 'Rivalries',
    'Nenhuma ativa': 'None active',
    'Histórico de Lutas': 'Fight History',
    'No Centro do Ringue': 'Ringside Analysis',
    'Central de Notícias': 'News Center',
    'Legado': 'Legacy',
    'Pontuação GOAT e conquistas': 'GOAT score and achievements',
    'Aposentar': 'Retire',
    'Aposentar-se': 'Retire',
    'Encerrar a carreira voluntariamente': 'End career voluntarily',
    'Avançar Semana': 'Advance Week',
    'Crise de Imagem': 'Image Crisis',
    'A imprensa aguarda uma resposta pública': 'The press awaits a public response',

    // ── Hub stat chips ──────────────────────────────────────
    'RANKING': 'RANKING',
    'OVERALL': 'OVERALL',
    'MORAL': 'MORALE',
    'DINHEIRO': 'MONEY',
    'DESPESAS': 'EXPENSES',
    'IDADE': 'AGE',
    'FORMA': 'FITNESS',
    'DESGASTE': 'WEAR',

    // ── Hub conditioning / status ───────────────────────────
    'Em forma': 'In shape',
    'Forma regular': 'Average fitness',
    'Fora de forma': 'Out of shape',
    'Fora': 'Unranked',
    'LESIONADO': 'INJURED',
    'semanas de recuperação restantes': 'weeks of recovery remaining',
    'semanas sem camp': 'weeks without camp',

    // ── Belt badges ─────────────────────────────────────────
    'INDISCUTÍVEL': 'UNDISPUTED',
    'SUPER CAMPEÃO': 'SUPER CHAMPION',
    'UNIFICADO': 'UNIFIED',
    'CAMPEÃO': 'CHAMPION',

    // ── Hub banner labels ────────────────────────────────────
    '📅': '📅',
    'Semana': 'Week',
    '📰 Últimas Notícias': '📰 Latest News',
    'Sem notícias recentes.': 'No recent news.',
    '📱 Redes Sociais': '📱 Social Media',

    // ── News scopes ─────────────────────────────────────────
    '📍 Local': '📍 Local',
    '🗺️ Regional': '🗺️ Regional',
    '🏳️ Nacional': '🏳️ National',
    '🌍 Continental': '🌍 Continental',

    // ── Training ────────────────────────────────────────────
    'Treino': 'Training',
    'Foco do Treino': 'Training Focus',
    '(máx. 3)': '(max. 3)',
    'Selecione até 3 áreas para focar no camp. Mais foco = mais ganho.': 'Select up to 3 areas to focus on. More focus = more gain.',
    'Semanas de treino': 'Training weeks',
    'Resultado do Treino': 'Training Result',
    'Descansar 1 Semana': 'Rest 1 Week',
    'Iniciar Camp →': 'Start Camp →',
    'Atributos Atuais': 'Current Attributes',
    'Custo do camp:': 'Camp cost:',
    '(+ salários da equipe)': '(+ staff wages)',
    'Risco: Alto': 'Risk: High',
    'Risco: Médio': 'Risk: Medium',
    'Risco: Baixo': 'Risk: Low',
    'Alto': 'High',
    'Médio': 'Medium',
    'Baixo': 'Low',

    // ── Training result ─────────────────────────────────────
    '✅ Camp concluído com sucesso!': '✅ Camp completed successfully!',
    '⚠️ Camp interrompido por lesão!': '⚠️ Camp interrupted by injury!',
    'Ganhos de Atributo': 'Attribute Gains',
    'Sem ganhos registrados.': 'No gains recorded.',

    // ── Training focuses ────────────────────────────────────
    'Condicionamento Físico': 'Physical Conditioning',
    'Força e Potência': 'Strength & Power',
    'Técnica de Boxe': 'Boxing Technique',
    'Defesa e Esquiva': 'Defense & Evasion',
    'Sparring Intenso': 'Intense Sparring',
    'Trabalho de Corpo': 'Body Work',
    'Preparação Mental': 'Mental Preparation',
    'Socos Diretos': 'Straight Punches',
    'Resiliência e Queixo': 'Resilience & Chin',

    // ── Strategies ──────────────────────────────────────────
    'Pressão Total': 'Full Pressure',
    'Pressionar desde o início': 'Press from the opening bell',
    'Esperar erro e punir': 'Wait for mistakes and punish',
    'Controle de Jab': 'Jab Control',
    'Trabalhar com jab e distância': 'Work behind the jab and control distance',
    'Atacar o Corpo': 'Body Attack',
    'Desgastar o adversário no corpo': 'Wear down the opponent to the body',
    'Buscar Nocaute': 'Go For KO',
    'Risco máximo, buscar finalização': 'Maximum risk, seek the finish',
    'Pontuar com Segurança': 'Safe Points',
    'Estratégia conservadora por pontos': 'Conservative points strategy',
    'Adaptar no Ringue': 'Adapt in the Ring',
    'Reagir conforme a luta evolui': 'React as the fight evolves',

    // ── Team / Staff ────────────────────────────────────────
    '👥 Equipe Técnica': '👥 Technical Staff',
    'Gerencie sua equipe. Cada membro melhora um aspecto da sua carreira.': 'Manage your team. Each member improves a different aspect of your career.',
    'Contratado': 'Hired',
    'Disponível para contratação': 'Available to hire',
    'Contratar': 'Hire',
    'Demitir': 'Fire',
    'Salário:': 'Salary:',
    '/semana': '/week',
    'Dinheiro insuficiente!': 'Insufficient funds!',
    'Membro da equipe demitido.': 'Staff member dismissed.',
    'contratado(s)': 'hired',
    'sem custos': 'no costs',
    'sem custo': 'no cost',

    // ── Staff role names ────────────────────────────────────
    'Técnico Principal': 'Head Coach',
    'Preparador Físico': 'Strength & Conditioning',
    'Nutricionista': 'Nutritionist',
    'Cutman': 'Cutman',
    'Psicólogo Esportivo': 'Sports Psychologist',
    'Analista de Adversários': 'Opponent Analyst',
    'Agente': 'Agent',

    // Staff tier names
    'Treinador Local': 'Local Trainer',
    'Treinador Nacional': 'National Trainer',
    'Treinador de Elite': 'Elite Trainer',
    'Estagiário': 'Intern',
    'Profissional': 'Professional',
    'Especialista de Elite': 'Elite Specialist',
    'Nutricionista Júnior': 'Junior Nutritionist',
    'Nutricionista Esportivo': 'Sports Nutritionist',
    'Referência Mundial': 'World Reference',
    'Cutman Iniciante': 'Rookie Cutman',
    'Cutman Experiente': 'Experienced Cutman',
    'Lenda do Corner': 'Corner Legend',
    'Psicólogo Clínico': 'Clinical Psychologist',
    'Mestre Mental': 'Mental Master',
    'Analista Amador': 'Amateur Analyst',
    'Analista Profissional': 'Professional Analyst',
    'Gênio Tático': 'Tactical Genius',
    'Agente Independente': 'Independent Agent',
    'Agente Renomado': 'Renowned Agent',
    'Superagente': 'Super Agent',

    // Staff effects
    'Aumenta os ganhos de atributo nos camps de treino': 'Increases attribute gains during training camps',
    'Reduz o risco de lesão durante os treinos': 'Reduces injury risk during training',
    'Acelera a recuperação de lesões': 'Accelerates injury recovery',
    'Reduz a chance do árbitro parar a luta (TKO sofrido)': 'Reduces the chance of the referee stopping the fight (TKO)',
    'Aumenta a confiança do lutador no início da luta': 'Increases the fighter\'s confidence at the start of the fight',
    'Revela atributos do adversário e melhora o plano de luta': 'Reveals opponent attributes and improves the game plan',
    'Melhora propostas, contrapropostas e valores de contrato': 'Improves offers, counteroffers and contract values',

    // ── Contracts ───────────────────────────────────────────
    '📄 Contratos e Promotores': '📄 Contracts & Promoters',
    'Escolha quem conduz sua carreira. Contratos melhores pagam mais, mas reduzem sua liberdade.': 'Choose who runs your career. Better contracts pay more, but reduce your freedom.',
    'CONTRATO ATIVO': 'ACTIVE CONTRACT',
    'lutas restantes': 'fights remaining',
    'Bolsa': 'Purse',
    'Bônus por vitória': 'Win Bonus',
    'Bônus por KO/TKO': 'KO/TKO Bonus',
    'Exclusividade': 'Exclusivity',
    'Sim': 'Yes',
    'Não': 'No',
    'obrigação(ões)': 'obligation(s)',
    'Multa rescisória': 'Termination Fee',
    'Romper Contrato': 'Break Contract',
    '✅ Agente livre': '✅ Free Agent',
    'negociando por você': 'negotiating for you',
    'Buscar Novas Propostas': 'Find New Offers',
    '🔄 Buscar Novas Propostas': '🔄 Find New Offers',
    'Novas propostas recebidas.': 'New offers received.',
    'Prestígio': 'Prestige',
    'luvas': 'signing bonus',
    'Duração': 'Duration',
    'lutas': 'fights',
    'Vitória': 'Win',
    'Rescisão': 'Termination',
    'Assinar': 'Sign',
    'Negociação encerrada': 'Negotiation closed',
    'Contrato assinado!': 'Contract signed!',
    'Contrato encerrado.': 'Contract terminated.',
    'Pressionar': 'Prestige',

    // Contract negotiation screen
    '🤝 Negociação de Contrato': '🤝 Contract Negotiation',
    'Rodadas restantes:': 'Rounds remaining:',
    'Cláusulas': 'Clauses',
    'difícil (~22%)': 'hard (~22%)',
    'normal (~52%)': 'normal (~52%)',
    '✔ negociada': '✔ negotiated',
    'Negociar': 'Negotiate',
    'Assinar com estas condições': 'Sign with these terms',
    '← Voltar às propostas': '← Back to offers',

    // Clause labels
    'Bolsa base': 'Base Purse',
    'Luvas de assinatura': 'Signing Bonus',
    'Obrigações de mídia': 'Media Obligations',
    'Duração do contrato': 'Contract Length',

    // ── Fight Select ────────────────────────────────────────
    '🥊 Escolher Luta': '🥊 Choose Fight',
    'Lutas disponíveis na sua categoria. Aceite uma para avançar ao camp pré-luta.': 'Available fights in your division. Accept one to advance to the pre-fight camp.',
    '🔄 Novas Ofertas': '🔄 New Offers',
    'Aceitar Luta →': 'Accept Fight →',
    'Risco': 'Risk',
    'Rounds': 'Rounds',
    'Promotora': 'Promoter',
    'Público projetado': 'Projected Attendance',
    'Posição no card': 'Card Position',
    'Evento Principal': 'Main Event',
    'Co-Main Event': 'Co-Main Event',
    'Undercard': 'Undercard',
    'LUTA DE UNIFICAÇÃO': 'UNIFICATION BOUT',
    'EM JOGO:': 'ON THE LINE:',
    'VAGO': 'VACANT',
    'Bolsa extra por ser revanche': 'Extra purse for being a rematch',
    'ranking': 'ranking',
    'ranking mundial': 'world ranking',

    // ── Pre-Fight (vestiário) ───────────────────────────────
    'Vestiário — Dia da Luta': 'Locker Room — Fight Night',
    'Adversário': 'Opponent',
    'Cartel': 'Record',
    'KOs': 'KOs',
    'Estilo': 'Style',
    'País': 'Country',
    'Ranking': 'Ranking',
    'Estratégia': 'Strategy',
    'Estratégia para esta luta': 'Strategy for this fight',
    'Esquema de Rounds': 'Round Plan',
    'Informações do Evento': 'Event Information',
    'Posição no Card': 'Card Position',
    'Arena': 'Arena',
    'Capacidade': 'Capacity',
    'Público estimado': 'Estimated attendance',
    'Bilheteria estimada': 'Estimated gate',
    'Ir para o Ringue →': 'Enter the Ring →',
    'Mando de Campo': 'Home Advantage',
    'Em casa': 'Home',
    'Neutro': 'Neutral',
    'Visitante': 'Away',
    'Casa': 'Home',
    'Fora': 'Away',
    'Atributos revelados pelo analista:': 'Attributes revealed by analyst:',

    // ── Fight screen ────────────────────────────────────────
    'ROUND': 'ROUND',
    'LUTA': 'FIGHT',
    'Simulação de Boxe': 'Boxing Simulation',
    'Velocidade:': 'Speed:',
    'Normal': 'Normal',
    'Rápido': 'Fast',
    'Turbo': 'Turbo',
    '⚡ Turbo': '⚡ Turbo',
    'Comentários': 'Commentary',
    'Scorecard': 'Scorecard',
    'Placar': 'Scorecard',
    'Controles': 'Controls',

    // ── Post-Fight ──────────────────────────────────────────
    'CAMPEÃO!': 'CHAMPION!',
    'DERROTA': 'DEFEAT',
    'NOCAUTE!': 'KNOCKOUT!',
    'NOCAUTE': 'KNOCKOUT',
    'VITÓRIA': 'VICTORY',
    'EMPATE': 'DRAW',
    'SEM RESULTADO': 'NO CONTEST',
    'O cinturão é seu.': 'The belt is yours.',
    'O título mudou de mãos.': 'The title has changed hands.',
    'Noite perfeita.': 'Perfect night.',
    'Hora de reconstruir.': 'Time to rebuild.',
    'Mais uma no cartel.': 'Another one on the record.',
    'Toda derrota ensina.': 'Every loss teaches.',
    'A decisão dividiu opiniões.': 'The decision divided opinions.',
    'O resultado foi anulado.': 'The result was voided.',
    '📊 Estatísticas da Luta': '📊 Fight Statistics',
    'Dano causado': 'Damage dealt',
    'Dano sofrido': 'Damage taken',
    'Knockdowns causados': 'Knockdowns landed',
    'Knockdowns sofridos': 'Knockdowns suffered',
    '📰 Repercussão na Mídia': '📰 Media Coverage',
    '📱 Redes Sociais': '📱 Social Media',
    '📈 Atualização de Carreira': '📈 Career Update',
    'Ranking': 'Ranking',
    'Moral': 'Morale',
    'Pagamento recebido': 'Payment received',
    'Público': 'Attendance',
    'Bilheteria': 'Gate',
    'Sua participação': 'Your share',
    'Continuar Carreira →': 'Continue Career →',

    // ── Athlete Stats ───────────────────────────────────────
    '📋 Ficha do Atleta': '📋 Fighter Profile',
    'Atributos': 'Attributes',
    'Ofensivo': 'Offensive',
    'Defensivo': 'Defensive',
    'Potencial': 'Potential',
    'OVR': 'OVR',
    'ATK': 'ATK',
    'DEF': 'DEF',
    'Histórico de Lutas': 'Fight History',
    'Ver histórico completo': 'View full history',

    // ── Fight History ────────────────────────────────────────
    '📋 Histórico de Lutas': '📋 Fight History',
    'Resultado': 'Result',
    'Adversário': 'Opponent',
    'Método': 'Method',
    'Data': 'Date',
    'Sem lutas registradas.': 'No fights recorded.',

    // ── Rankings ────────────────────────────────────────────
    '📊 Rankings': '📊 Rankings',
    'Posição': 'Position',
    'Lutador': 'Fighter',
    'Nação': 'Nation',
    'Você': 'You',

    // ── Weight Class change ─────────────────────────────────
    '⚖️ Mudar de Divisão': '⚖️ Change Division',
    'Categoria atual': 'Current division',
    'Categorias disponíveis': 'Available divisions',
    'Subir de Divisão': 'Move Up',
    'Descer de Divisão': 'Move Down',
    'semanas de adaptação': 'weeks of adaptation',
    'Adaptação em progresso': 'Adaptation in progress',
    'semanas restantes': 'weeks remaining',

    // ── Challenges ──────────────────────────────────────────
    '📨 Desafios Recebidos': '📨 Incoming Challenges',
    'Aceitar Desafio': 'Accept Challenge',
    'Recusar': 'Decline',
    'Nenhum desafio recebido.': 'No challenges received.',
    'Campeão mundial': 'World champion',
    'Top 10': 'Top 10',
    'Top 20': 'Top 20',
    'Não elegível': 'Not eligible',
    'Status:': 'Status:',
    'Forma:': 'Fitness:',

    // ── Legacy ──────────────────────────────────────────────
    '🏛️ Legado': '🏛️ Legacy',
    'Pontos de Legado': 'Legacy Points',
    'Pontos de legado': 'Legacy points',
    'pts para próxima tier': 'pts to next tier',
    '✦ Nível máximo atingido': '✦ Maximum tier reached',
    'Cartel final': 'Final Record',
    'KO%': 'KO%',
    'Anos em atividade': 'Years active',
    'Idade de aposentadoria': 'Retirement age',
    'Títulos Mundiais': 'World Titles',
    'Defesas': 'Defenses',
    'Defesas de título': 'Title defenses',
    'Unificações': 'Unifications',
    'Divisões com Mundial': 'Divisions with World Title',
    'Super-Cinturões': 'Super Belts',
    'Títulos Conquistados': 'Titles Won',
    'Vitórias Top-5': 'Top-5 Wins',
    'Recorde de Público': 'Attendance Record',
    'Recorde de Bilheteria': 'Gate Record',
    'Eventos Esgotados': 'Sellout Events',
    'Main Events': 'Main Events',
    'OVR Atual': 'Current OVR',
    'Anos': 'Years',
    'Carreira': 'Career',
    '🏟️ Grandes Eventos': '🏟️ Major Events',
    '✨ Super-Cinturões': '✨ Super Belts',
    'Conquistados após 10 defesas do mesmo cinturão mundial.': 'Earned after 10 defenses of the same world belt.',
    'Notáveis Vitórias': 'Notable Wins',
    '⭐ Notáveis Vitórias': '⭐ Notable Wins',
    'Conquistas': 'Achievements',

    // Legacy tier labels
    'GOAT — O Maior de Todos': 'GOAT — The Greatest of All Time',
    'Lenda Imortal': 'Immortal Legend',
    'Campeão de Elite': 'Elite Champion',
    'Campeão Consagrado': 'Established Champion',
    'Lutador Profissional': 'Professional Fighter',
    'Lutador de Clube': 'Club Fighter',
    'Prospecto': 'Prospect',

    // ── Investments / Gym ────────────────────────────────────
    '💰 Investimentos': '💰 Investments',
    'Academia': 'Gym',
    'Nível atual:': 'Current level:',
    'Melhorar': 'Upgrade',
    'Custo:': 'Cost:',
    'Ganhos semanais:': 'Weekly income:',
    'Investimentos Financeiros': 'Financial Investments',
    'Saldo bancário:': 'Bank balance:',

    // ── Rivals ──────────────────────────────────────────────
    '⚔️ Rivalidades': '⚔️ Rivalries',
    'Intensidade:': 'Intensity:',
    'Nenhuma rivalidade ativa.': 'No active rivalries.',
    'Rival': 'Rival',

    // ── News Center ─────────────────────────────────────────
    '📰 Central de Notícias': '📰 News Center',
    'Todas': 'All',
    'Lutas': 'Fights',
    'Títulos': 'Titles',
    'Carreira': 'Career',
    'Mundo': 'World',
    'Sem notícias.': 'No news.',

    // ── Analyst Show ────────────────────────────────────────
    'No Centro do Ringue': 'Ringside Analysis',

    // ── Retirement screen ────────────────────────────────────
    '📊 Resumo da Carreira': '📊 Career Summary',
    'Anos em atividade': 'Years active',
    'Hall da Fama — Imortal': 'Hall of Fame — Immortal',
    'Hall da Fama — Elite': 'Hall of Fame — Elite',
    'Hall da Fama — Consagrado': 'Hall of Fame — Established',
    'Reconhecido': 'Recognized',
    'Lutador de clube': 'Club Fighter',
    '🏆 Títulos Conquistados': '🏆 Titles Won',
    '🏅 Troféus Territoriais': '🏅 Territorial Trophies',
    'Nacional': 'National',
    'Regional': 'Regional',
    'Local': 'Local',
    '⭐ Grandes Vitórias': '⭐ Notable Wins',
    'Ver Legado Completo': 'View Full Legacy',

    // Retirement reasons
    'decidiu encerrar sua carreira nos seus próprios termos.': 'decided to end their career on their own terms.',
    'chegou ao limite da idade permitida para competição profissional.': 'reached the age limit for professional competition.',
    'acumulou desgaste físico suficiente para obrigar o encerramento da carreira.': 'accumulated enough physical wear to force a career end.',
    'sofreu três nocautes consecutivos, sendo aposentado por decisão médica.': 'suffered three consecutive knockouts and was retired by medical decision.',
    'encerrou sua carreira.': 'ended their career.',

    // ── Media / Interview ────────────────────────────────────
    'Entrevista Coletiva': 'Press Conference',
    'Próxima pergunta →': 'Next question →',
    'Encerrar entrevista': 'End interview',
    'Encarada': 'Face-Off',
    'Iniciar Encarada →': 'Start Face-Off →',

    // ── Fight Camp ───────────────────────────────────────────
    'Camp Pré-Luta': 'Pre-Fight Camp',
    'Sparring': 'Sparring',
    'Análise do Adversário': 'Opponent Analysis',
    'Descanso': 'Rest',
    'Ir para Luta →': 'Go to Fight →',

    // ── Toast / confirm messages ──────────────────────────────
    'Jogo salvo!': 'Game saved!',
    'Voltar ao menu? Salve antes!': 'Return to menu? Save first!',
    'Tem certeza que deseja encerrar sua carreira? Esta ação é permanente.': 'Are you sure you want to retire? This action is permanent.',

    // ── Generic UI ───────────────────────────────────────────
    'Idioma': 'Language',
    'contratado!': 'hired!',
    'Semanas de treino intenso.': 'weeks of intense training.',
    'sem': 'wk',

    // ── Nation names ───────────────────────────────────────
    'EUA': 'USA',
    'Brasil': 'Brazil',
    'México': 'Mexico',
    'Argentina': 'Argentina',
    'Cuba': 'Cuba',
    'Porto Rico': 'Puerto Rico',
    'Reino Unido': 'United Kingdom',
    'Ucrânia': 'Ukraine',
    'Rússia': 'Russia',
    'Alemanha': 'Germany',
    'Itália': 'Italy',
    'Espanha': 'Spain',
    'Irlanda': 'Ireland',
    'Filipinas': 'Philippines',
    'Japão': 'Japan',
    'Cazaquistão': 'Kazakhstan',
    'Uzbequistão': 'Uzbekistan',
    'Tailândia': 'Thailand',
    'Nigéria': 'Nigeria',
    'Gana': 'Ghana',
    'África do Sul': 'South Africa',
    'Austrália': 'Australia',
    'Nova Zelândia': 'New Zealand',

    // ── Continents ─────────────────────────────────────────
    'Américas': 'Americas',
    'Europa': 'Europe',
    'Ásia': 'Asia',
    'África': 'Africa',
    'Oceania': 'Oceania',

    // ── Personalities ──────────────────────────────────────
    'Disciplinado': 'Disciplined',
    'Carismático': 'Charismatic',
    'Arrogante': 'Arrogant',
    'Humilde': 'Humble',
    'Explosivo': 'Volatile',
    'Calculista': 'Calculating',
    'Faminto': 'Hungry',
    'Veterano': 'Veteran',
    'Ritmo constante e economia de energia: gasta menos gás e mantém a guarda firme.': 'Steady pace and energy conservation: burns less gas and keeps the guard tight.',
    'Se alimenta da torcida: começa a luta com mais confiança.': 'Feeds off the crowd: starts fights with extra confidence.',
    'Imponente no início, ataca com tudo nos primeiros rounds — mas desanima se estiver perdendo.': 'Imposing early, attacks full throttle in the opening rounds — but loses heart when behind.',
    'Pés no chão: defesa sólida e recupera bem a confiança no corner.': 'Grounded: solid defense and recovers confidence well in the corner.',
    'Pura dinamite: mais poder de nocaute, mas queima energia rápido demais.': 'Pure dynamite: greater knockout power, but burns energy far too quickly.',
    'Lê a luta como xadrez: defesa apurada e cresce nos rounds finais.': 'Reads the fight like chess: sharp defense and gets stronger in the late rounds.',
    'Não aceita perder: ataca com fúria redobrada quando está atrás no placar.': 'Refuses to lose: attacks with redoubled fury when trailing on the scorecards.',
    'Manha de quem já viu de tudo: domina os rounds finais e não se abala com quedas.': 'The savvy of someone who has seen it all: controls late rounds and shrugs off knockdowns.',

    // ── Style Synergy labels ────────────────────────────────
    'Demolidor Imprevisível': 'Unpredictable Destroyer',
    'Sede de Nocaute': 'Knockout Hunger',
    'Pressão Implacável': 'Relentless Pressure',
    'Furacão': 'Hurricane',
    'Rolo Compressor': 'Steamroller',
    'Mestre da Distância': 'Distance Master',
    'Relojoeiro': 'Clockwork',
    'Armadilha Perfeita': 'Perfect Trap',
    'Velha Raposa': 'Old Fox',
    'Cirurgião do Ringue': 'Ring Surgeon',
    'O Maestro': 'The Maestro',
    'Enxame Voraz': 'Voracious Swarm',
    'Máquina de Volume': 'Volume Machine',
    'Estrategista Completo': 'Complete Strategist',
    'A Estrela': 'The Star',
    'Poder bruto sem freio.': 'Raw power with no brakes.',
    'Caça a finalização o tempo todo.': 'Always hunting for the finish.',
    'Não dá um segundo de respiro.': 'Never gives a second to breathe.',
    'Avalanche de violência.': 'Avalanche of violence.',
    'Pressão metódica e incansável.': 'Methodical, relentless pressure.',
    'Controla o ringue de longe.': 'Controls the ring from the outside.',
    'Pontua com precisão suíça.': 'Scores with Swiss-watch precision.',
    'Espera o erro e pune.': 'Waits for the mistake and punishes.',
    'Manha pura no contragolpe.': 'Pure craft on the counter.',
    'Cada golpe no lugar exato.': 'Every punch landing in the right place.',
    'Rege a luta como uma orquestra.': 'Conducts the fight like an orchestra.',
    'Volume sufocante de golpes.': 'Suffocating punch volume.',
    'Bombeia golpes sem cansar.': 'Pumps punches without tiring.',
    'Equilíbrio e inteligência.': 'Balance and intelligence.',
    'Talento que enche arenas.': 'Talent that fills arenas.',

    // ── Nationality Traits ──────────────────────────────────
    'Showman Americano': 'American Showman',
    'A terra do show business: holofotes e bolsas gordas, mas muitas distrações.': 'The land of show business: bright lights and fat purses, but many distractions.',
    'Sangue Azteca': 'Aztec Blood',
    'O estilo guerreiro mexicano: ataque ao corpo devastador e coração de aço — mas defesa é coisa de covarde.': 'The Mexican warrior style: devastating body attack and heart of steel — but defense is for cowards.',
    'Garra Brasileira': 'Brazilian Grit',
    'Talento natural e carisma de sobra, mas a base técnica do boxe nacional ainda engatinha.': 'Natural talent and plenty of charisma, but the technical foundation of domestic boxing is still catching up.',
    'Coração Guerreiro': 'Warrior Heart',
    'Como Monzón e Maidana: queixo de granito e nunca recua — mas a disciplina às vezes fica no vestiário.': 'Like Monzón and Maidana: granite chin and never takes a step back — but discipline sometimes stays in the locker room.',
    'Escola Cubana': 'Cuban School',
    'A lendária escola amadora: técnica olímpica impecável, mas pouco brilho comercial e estilo "seguro demais".': 'The legendary amateur school: flawless Olympic technique, but little commercial flair and a style that is "too safe".',
    'Ídolo Boricua': 'Boricua Idol',
    'A ilha respira boxe: ídolos instantâneos com mãos rápidas, mas o gás nem sempre acompanha.': 'The island breathes boxing: instant idols with quick hands, but the gas tank does not always keep up.',
    'Orgulho Britânico': 'British Pride',
    'Arenas lotadas e bolsas enormes — mas a pressão de 90 mil torcedores pesa nos ombros.': 'Packed arenas and huge purses — but the weight of 90,000 fans bears down on the shoulders.',
    'Aço do Leste': 'Eastern Steel',
    'Pedigree amador de elite: QI de ringue e precisão cirúrgica, mas mercado pequeno e pouco hype.': 'Elite amateur pedigree: ring IQ and surgical precision, but a small market and little hype.',
    'Escola Russa': 'Russian School',
    'Disciplina militar e direto demolidor — mas frieza demais não vende ingresso nem improvisa no ringue.': 'Military discipline and a demolishing straight — but too much coldness does not sell tickets or improvise in the ring.',
    'Precisão Germânica': 'German Precision',
    'Cada golpe calculado ao milímetro — mas falta a explosão e o brilho dos rivais.': 'Every punch calculated to the millimeter — but lacks the explosion and flair of rivals.',
    'Maestria Italiana': 'Italian Mastery',
    'Defesa elegante e contra-ataque artístico — mas sem a pegada para definir lutas.': 'Elegant defense and artistic counter-punching — but without the power to finish fights.',
    'Fúria Espanhola': 'Spanish Fury',
    'Pressão incansável de touro de arena — mas previsível para quem sabe contra-atacar.': 'Relentless bull-ring pressure — but predictable for those who know how to counter.',
    'Coração Irlandês': 'Irish Heart',
    'Coragem lendária e torcida apaixonada — mas o sangue quente trai nos momentos decisivos.': 'Legendary courage and passionate support — but hot blood betrays at decisive moments.',
    'Tufão Filipino': 'Philippine Typhoon',
    'Velocidade alucinante e combinações em rajada à la Pacquiao — mas defesa fica em segundo plano.': 'Blistering speed and burst combinations à la Pacquiao — but defense takes a back seat.',
    'Disciplina Samurai': 'Samurai Discipline',
    'Dedicação monástica ao ofício e calma absoluta — mas o físico raramente é o mais forte.': 'Monastic dedication to the craft and absolute calm — but the physique is rarely the strongest.',
    'Punhos de Aço': 'Fists of Steel',
    'Pegada assustadora estilo GGG: todo mundo respeita, ninguém quer enfrentar — e isso custa fama.': 'Frightening GGG-style power: everyone respects it, nobody wants to face it — and that costs fame.',
    'Mestre Amador': 'Amateur Master',
    'Fábrica de medalhistas olímpicos: leitura de luta excepcional, mas o circuito profissional ainda é novidade.': 'Factory of Olympic medalists: exceptional fight-reading, but the professional circuit is still new territory.',
    'Guerreiro de Ferro': 'Iron Warrior',
    'Forjado no muay thai: corpo castigado vira rotina e o gás nunca acaba — mas o boxe de mãos é cru.': 'Forged in Muay Thai: a battered body is routine and the gas tank never empties — but the hand boxing is raw.',
    'Potência Africana': 'African Power',
    'Força física fora da curva — mas a lapidação técnica chegou tarde.': 'Off-the-charts physical strength — but technical refinement came late.',
    'Lenda de Bukom': 'Bukom Legend',
    'O bairro que produz campeões: queixo indestrutível e coragem infinita — mas treinar... nem sempre.': 'The neighborhood that produces champions: indestructible chin and infinite courage — but training... not always.',
    'Velocista do Cabo': 'Cape Speedster',
    'Movimentação e ritmo de sobra nas categorias leves — mas falta peso na mão.': 'Plenty of movement and rhythm in the lighter divisions — but lacks hand power.',
    'Brigador do Outback': 'Outback Brawler',
    'Nunca recusa uma trocação e o público adora — mas sair ileso é outra história.': 'Never refuses a firefight and the crowd loves it — but coming out unscathed is another story.',
    'Força Kiwi': 'Kiwi Power',
    'Físico de rugby e calma de ilha — mas os pés não acompanham os pesados do mundo.': 'Rugby physique and island calm — but the feet do not keep up with the heavyweights of the world.',

    // ── Attribute labels ────────────────────────────────────
    'Durabilidade': 'Durability',
    'Jogo de Pés': 'Footwork',
    'Golpes no Corpo': 'Body Punching',
    'Cruzado': 'Cross',
    'Uppercut': 'Uppercut',
    'Disciplina': 'Discipline',
    'Adaptação': 'Adaptation',
    'Pressão': 'Pressure',
    'Popularidade': 'Popularity',
    'Reputação': 'Reputation',

    // ── Fighting styles ─────────────────────────────────────
    'Lutador de Pressão': 'Pressure Fighter',
    'Boxeador': 'Outboxer',
    'Contra-Atacante': 'Counter Puncher',
    'Nocauteador': 'Slugger',
    'Swarmador': 'Swarmer',
    'Técnico': 'Technical',
    'Boxeador-Nocauteador': 'Boxer-Puncher',

    // ── NEWS_TEMPLATES (static pick strings) ─────────────────
    // These are picked randomly and have {placeholder} vars.
    // They're NOT in the DOM, so handled separately in data.js.

    // ── Promoter descriptions ────────────────────────────────
    'Grandes eventos, bolsas altas e exigência máxima.': 'Big events, high purses and maximum demands.',
    'Especialista em construir disputas de cinturão.': 'Specialist in building title contenders.',
    'Valoriza nocautes, rivalidades e lutas agressivas.': 'Values knockouts, rivalries and aggressive fights.',
    'Forte presença nas Américas e boa progressão regional.': 'Strong presence in the Americas and good regional progression.',
    'Muitos eventos e contratos flexíveis para prospectos.': 'Many events and flexible contracts for prospects.',
    'Circuito de entrada, pouca exposição e liberdade total.': 'Entry-level circuit, little exposure and total freedom.',

    // ── Nickname translations ────────────────────────────────
    'O Demolidor': 'The Demolisher',
    'A Máquina': 'The Machine',
    'Trem-Bala': 'Bullet Train',
    'O Monstro': 'The Monster',
    'Punho de Ferro': 'Iron Fist',
    'A Cobra': 'The Cobra',
    'O Furacão': 'The Hurricane',
    'Trovão': 'Thunder',
    'Relâmpago': 'Lightning',
    'O Guerreiro': 'The Warrior',
    'O Predador': 'The Predator',
    'Sangue Frio': 'Cold Blood',
    'Dinamite': 'Dynamite',
    'O Algoz': 'The Executioner',
    'Tempestade': 'Storm',
    'O Inquebrável': 'The Unbreakable',
    'Dragão': 'Dragon',
    'O Canhão': 'The Cannon',
    'Punição': 'Punishment',
    'O Venenoso': 'The Viper',
    'Fúria': 'Fury',
    'O Fanático': 'The Fanatic',
    'A Bala': 'The Bullet',
    'Bigorna': 'Anvil',
    'Terremoto': 'Earthquake',
    'A Lenda': 'The Legend',
    'O Invicto': 'The Undefeated',
    'Nocaute': 'Knockout',
    'Flash': 'Flash',
  };

  // ──────────────────────────────────────────────────────────
  // Core functions
  // ──────────────────────────────────────────────────────────

  function getLang() { return _lang; }

  function setLang(lang) {
    _lang = lang;
    localStorage.setItem('ringue_lang', lang);
    // Update html lang attribute
    document.documentElement.lang = lang === 'en' ? 'en' : 'pt-BR';
  }

  // Translate a static string
  function t(str) {
    if (!str) return str;
    if (_lang === 'pt') return str;
    return LANG_EN[str] !== undefined ? LANG_EN[str] : str;
  }

  // Translate a template string with {key} placeholders
  function tf(ptTemplate, vars) {
    let str = t(ptTemplate);
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(`{${k}}`, v);
      }
    }
    return str;
  }

  // Walk the DOM of #app and replace text nodes
  function applyLang() {
    if (_lang === 'pt') return;
    const root = document.getElementById('app');
    if (!root) return;
    _walk(root);
  }

  function _walk(node) {
    if (node.nodeType === 3) { // TEXT_NODE
      const orig = node.textContent;
      const trimmed = orig.trim();
      if (trimmed && LANG_EN[trimmed] !== undefined) {
        node.textContent = orig.replace(trimmed, LANG_EN[trimmed]);
      }
    } else if (node.nodeType === 1) { // ELEMENT_NODE
      // Translate title attributes (tooltips)
      if (node.title) {
        const tr = LANG_EN[node.title.trim()];
        if (tr !== undefined) node.title = tr;
      }
      // Translate placeholder attributes
      if (node.placeholder) {
        const tr = LANG_EN[node.placeholder.trim()];
        if (tr !== undefined) node.placeholder = tr;
      }
      for (const child of node.childNodes) _walk(child);
    }
  }

  // ──────────────────────────────────────────────────────────
  // Expose globally
  // ──────────────────────────────────────────────────────────
  window.I18n = { getLang, setLang, t, tf, applyLang };

  // Shorthand globals for use in ui.js computed strings
  window.t  = t;
  window.tf = tf;

})();
