/**
 * Spanish (Mexico) translations. Keys are the exact English strings passed to
 * t(). Anything missing here silently falls back to English.
 *
 * Translated in neutral Mexican Spanish; a native-speaker review pass is
 * recommended before wide release.
 */
export const es: Record<string, string> = {
  // ── Navigation / tabs ─────────────────────────────────────────────
  "Home": "Inicio",
  "Reps": "Reps",
  "Elections": "Elecciones",
  "Bills": "Leyes",
  "More": "Más",

  // ── Auth: sign in / register / reset ──────────────────────────────
  "Sign In": "Iniciar sesión",
  "Email": "Correo electrónico",
  "Password": "Contraseña",
  "Enter password": "Escribe tu contraseña",
  "Forgot password?": "¿Olvidaste tu contraseña?",
  "or continue with": "o continúa con",
  "Don't have an account?": "¿No tienes cuenta?",
  "Create Account": "Crear cuenta",
  "Already have an account?": "¿Ya tienes cuenta?",
  "Join UDecide to access voter tools and political information":
    "Únete a UDecide para acceder a herramientas del votante e información política",
  "First Name": "Nombre",
  "Last Name": "Apellido",
  "Jane": "Juana",
  "Smith": "Pérez",
  "Confirm Password": "Confirmar contraseña",
  "Re-enter password": "Vuelve a escribir la contraseña",
  "Min. 8 characters": "Mín. 8 caracteres",
  "City": "Ciudad",
  "Your city": "Tu ciudad",
  "ZIP Code": "Código postal",
  "Registration failed": "No se pudo crear la cuenta",
  "Reset Password": "Restablecer contraseña",
  "Email Address": "Dirección de correo",
  "Enter your email and we'll send instructions to reset your password.":
    "Escribe tu correo y te enviaremos instrucciones para restablecer tu contraseña.",
  "Send Reset Instructions": "Enviar instrucciones",
  "Back to Sign In": "Volver a iniciar sesión",
  "Check Your Email": "Revisa tu correo",
  "If an account exists for": "Si existe una cuenta para",
  "you'll receive password reset instructions shortly.":
    "recibirás instrucciones para restablecer tu contraseña en breve.",
  "Almost There": "Ya casi terminas",
  "We just need a couple of details to finish setting up your account.":
    "Solo necesitamos un par de datos para terminar de configurar tu cuenta.",
  "Continue": "Continuar",
  "Cancel": "Cancelar",
  "This sign-in link has expired. Please try signing in again.":
    "Este enlace de acceso expiró. Intenta iniciar sesión de nuevo.",
  "Unable to create account. Please try again.":
    "No se pudo crear la cuenta. Inténtalo de nuevo.",
  "Your Location": "Tu ubicación",
  "Set your address to see local representatives, elections, and voting information. You can change this anytime.":
    "Registra tu dirección para ver representantes locales, elecciones e información de votación. Puedes cambiarla cuando quieras.",
  "Street Address": "Calle y número",
  "123 Main Street": "Av. Principal 123",
  "State (2-letter code)": "Estado (código de 2 letras)",
  "State (2-letter)": "Estado (2 letras)",
  "Save & Continue": "Guardar y continuar",
  "Skip for now": "Omitir por ahora",
  "Your address is stored locally on your device and is used only to provide relevant political information.":
    "Tu dirección se guarda localmente en tu dispositivo y se usa solo para mostrarte información política relevante.",
  "Account creation can take a few seconds. Your information is used only to provide relevant political information.":
    "La creación de la cuenta puede tardar unos segundos. Tu información se usa solo para brindarte información política relevante.",
  "Google sign-in failed. Please try again.":
    "No se pudo iniciar sesión con Google. Inténtalo de nuevo.",
  "Google sign-in was not completed.": "El inicio de sesión con Google no se completó.",
  "Google sign-in is temporarily unavailable. Please use email sign-in.":
    "El inicio de sesión con Google no está disponible por el momento. Usa tu correo electrónico.",
  "Google sign-in is unavailable right now. Please use email sign-in.":
    "El inicio de sesión con Google no está disponible ahora. Usa tu correo electrónico.",
  "Google sign-in isn't configured for this build yet. Please use email sign-in.":
    "El inicio de sesión con Google aún no está configurado en esta versión. Usa tu correo electrónico.",
  "Can't reach the sign-in service. Check your connection and try again.":
    "No se pudo conectar con el servicio de acceso. Revisa tu conexión e inténtalo de nuevo.",
  "Unable to sign in. Please try again.": "No se pudo iniciar sesión. Inténtalo de nuevo.",
  "Your session has expired. Please sign in again.":
    "Tu sesión expiró. Inicia sesión de nuevo.",
  "UDecide is nonpartisan and does not endorse any candidate or party.":
    "UDecide es imparcial y no respalda a ningún candidato ni partido.",

  // ── Validation ────────────────────────────────────────────────────
  "Email is required": "El correo electrónico es obligatorio",
  "Please enter a valid email address": "Escribe una dirección de correo válida",
  "Password is required": "La contraseña es obligatoria",
  "Password must be at least 8 characters": "La contraseña debe tener al menos 8 caracteres",
  "Passwords do not match": "Las contraseñas no coinciden",
  "Please confirm your password": "Confirma tu contraseña",
  "Full name is required": "El nombre completo es obligatorio",
  "Name must be at least 2 characters": "El nombre debe tener al menos 2 caracteres",
  "ZIP code is required": "El código postal es obligatorio",
  "Enter a valid ZIP code": "Escribe un código postal válido",
  "State is required": "El estado es obligatorio",
  "Enter a valid state abbreviation": "Escribe una abreviatura de estado válida",
  "is required": "es obligatorio",
  "Address": "Dirección",

  // ── Dashboard (Home) ──────────────────────────────────────────────
  "Good morning": "Buenos días",
  "Good afternoon": "Buenas tardes",
  "Good evening": "Buenas noches",
  "Voter": "Votante",
  "Viewing:": "Viendo:",
  "Nonpartisan": "Imparcial",
  "Quick Access": "Acceso rápido",
  "Voter Status Tools": "Herramientas del votante",
  "Registration, polling, ID": "Registro, casillas e identificación",
  "Representatives": "Representantes",
  "Your elected officials": "Tus funcionarios electos",
  "Elections & Ballots": "Elecciones y boletas",
  "Candidates and ballot info": "Candidatos e información de la boleta",
  "Political Guide": "Guía política",
  "Government education": "Educación cívica",
  "Civics 101 Quiz": "Quiz de civismo 101",
  "Test your knowledge": "Pon a prueba tus conocimientos",
  "Political Polls": "Encuestas políticas",
  "Community insights": "Opinión de la comunidad",
  "Legislation Tracker": "Monitor legislativo",
  "Bills and laws": "Iniciativas y leyes",
  "Fact Checker": "Verificador de datos",
  "AI-powered analysis": "Análisis con IA",
  "Political Parties": "Partidos políticos",
  "Party information": "Información de partidos",
  "UDecide is committed to political neutrality. We do not endorse or rank any candidate, party, or policy. Information is sourced from official government records and labeled by source.":
    "UDecide mantiene un compromiso de neutralidad política. No respaldamos ni clasificamos a ningún candidato, partido o política. La información proviene de registros gubernamentales oficiales y se etiqueta según su fuente.",

  // ── News ──────────────────────────────────────────────────────────
  "Political News": "Noticias políticas",
  "Nonpartisan updates": "Actualizaciones imparciales",
  "Read the latest political news": "Lee las últimas noticias políticas",
  "No news available right now.": "No hay noticias disponibles por ahora.",
  "Couldn't load news. Tap to retry.": "No se pudieron cargar las noticias. Toca para reintentar.",
  "Failed to load news": "No se pudieron cargar las noticias",
  "Article": "Artículo",
  "Read full story": "Leer la nota completa",
  "The full text of this article isn't available here. Open the original story to read more.":
    "El texto completo de este artículo no está disponible aquí. Abre la nota original para leer más.",

  // ── Representatives ───────────────────────────────────────────────
  "Your Representatives": "Tus representantes",
  "All": "Todos",
  "Federal": "Federal",
  "State": "Estatal",
  "County": "Condado",
  "Live data · Cicero API": "Datos en vivo · API de Cicero",
  "Sample data": "Datos de muestra",
  "representatives found": "representantes encontrados",
  "representative found": "representante encontrado",
  "No Representatives Found": "No se encontraron representantes",
  "No representatives found for the selected level at this address.":
    "No se encontraron representantes del nivel seleccionado para esta dirección.",
  "No representatives found for the selected level in your area.":
    "No se encontraron representantes del nivel seleccionado en tu zona.",
  "Enter a full street address (with house number) in Address Settings to load your local representatives.":
    "Escribe una dirección completa (con número) en la configuración de dirección para cargar tus representantes locales.",
  "-level officials mapped for this address. Coverage of local offices varies by town — federal and state officials are still available under those tabs.":
    ": no hay funcionarios de ese nivel asignados a esta dirección. La cobertura de cargos locales varía según la localidad; los funcionarios federales y estatales siguen disponibles en sus pestañas.",
  "Our data provider doesn't have": "Nuestro proveedor de datos no tiene",
  "Showing sample representatives. Add a Cicero API key and set your full address to see live federal, state, county, and city officials.":
    "Mostrando representantes de muestra. Agrega una clave de la API de Cicero y registra tu dirección completa para ver funcionarios federales, estatales, de condado y municipales en vivo.",
  "Unable to load representatives": "No se pudieron cargar los representantes",
  "Incumbent": "En funciones",
  "Recent Votes": "Votaciones recientes",
  "Website": "Sitio web",
  "Official Website": "Sitio web oficial",
  "Yea": "A favor",
  "Nay": "En contra",
  "Yea:": "A favor:",
  "Nay:": "En contra:",
  "Absent:": "Ausentes:",
  "Cicero": "Cicero",

  // ── Elections ─────────────────────────────────────────────────────
  "Upcoming elections in": "Próximas elecciones en",
  "No Upcoming Elections": "No hay elecciones próximas",
  "No elections found for": "No se encontraron elecciones para",
  "at this time.": "por el momento.",
  "Election": "Elección",
  "Election Day": "Día de la elección",
  "Registration Deadline": "Fecha límite de registro",
  "Early Voting": "Votación anticipada",
  "Absentee": "Voto en ausencia",
  "Election Info": "Información electoral",
  "Find Polling Place": "Encontrar casilla",
  "Offices on the Ballot": "Cargos en la boleta",
  "candidate": "candidato",
  "candidates": "candidatos",
  "Candidate and ballot information will appear here as it becomes available closer to election day.":
    "La información de candidatos y boletas aparecerá aquí conforme esté disponible al acercarse el día de la elección.",
  "Tap 'Election Info' above for the latest details.":
    "Toca 'Información electoral' arriba para ver los detalles más recientes.",
  "Live · Google Civic Information API": "En vivo · API de Google Civic Information",
  "Sample data · Add CIVIC_API_KEY for live elections":
    "Datos de muestra · Agrega CIVIC_API_KEY para elecciones en vivo",
  "Election information should be verified with your official state or local election office.":
    "La información electoral debe verificarse con tu autoridad electoral estatal o local oficial.",
  "UDecide presents factual, nonpartisan information sourced from official government records. We do not endorse any candidate, party, or policy. Always verify election information with your official state election office.":
    "UDecide presenta información objetiva e imparcial proveniente de registros gubernamentales oficiales. No respaldamos a ningún candidato, partido o política. Verifica siempre la información electoral con tu autoridad electoral estatal oficial.",
  "General": "General",
  "Primary": "Primaria",
  "Special": "Extraordinaria",
  "Runoff": "Segunda vuelta",
  "General Election": "Elección general",
  "Primary Election": "Elección primaria",
  "Special Election": "Elección extraordinaria",
  "UDecide does not endorse any candidate.": "UDecide no respalda a ningún candidato.",

  // ── Legislation ───────────────────────────────────────────────────
  "U.S. Congress — recent federal bills": "Congreso de EE. UU. — iniciativas federales recientes",
  "Bills and laws from your state": "Iniciativas y leyes de tu estado",
  "Search federal bills...": "Buscar iniciativas federales...",
  "Search state bills...": "Buscar iniciativas estatales...",
  "No Bills Found": "No se encontraron iniciativas",
  "No bills available for this state yet. Try a different state or search term.":
    "Aún no hay iniciativas para este estado. Prueba con otro estado u otra búsqueda.",
  "Try a different search term.": "Prueba con otro término de búsqueda.",
  "Unable to load legislation data": "No se pudieron cargar los datos legislativos",
  "Description": "Descripción",
  "Status": "Estado",
  "Last Action": "Última acción",
  "Sponsors": "Promoventes",
  "Legislative History": "Historial legislativo",
  "Votes": "Votaciones",
  "Source:": "Fuente:",
  "View Details": "Ver detalles",
  "Introduced": "Presentada",
  "Prefiled": "Prepresentada",
  "In Committee": "En comisión",
  "Engrossed": "Aprobada en cámara de origen",
  "Passed House": "Aprobada en la Cámara",
  "Passed Senate": "Aprobada en el Senado",
  "Passed": "Aprobada",
  "Enrolled": "Lista para promulgación",
  "Signed": "Promulgada",
  "Became Law": "Convertida en ley",
  "Vetoed": "Vetada",
  "Failed": "Rechazada",

  // ── More menu ─────────────────────────────────────────────────────
  "Tools, guides, and settings": "Herramientas, guías y configuración",
  "Voter Tools": "Herramientas del votante",
  "Political Information": "Información política",
  "AI & Fact Checking": "IA y verificación de datos",
  "Gemini Fact Checker": "Verificador de datos Gemini",
  "Account": "Cuenta",
  "My Profile": "Mi perfil",
  "Address Override": "Ubicación alternativa",
  "Sign Out": "Cerrar sesión",
  "UDecide presents factual, nonpartisan information. We do not endorse any candidate, party, or policy.":
    "UDecide presenta información objetiva e imparcial. No respaldamos a ningún candidato, partido o política.",

  // ── Voter tools ───────────────────────────────────────────────────
  "voter information": "información para votantes",
  "Voter Registration": "Registro de votantes",
  "Registration": "Registro",
  "Online Registration": "Registro en línea",
  "Same-Day Registration": "Registro el mismo día",
  "Check Registration Status": "Verificar estado de registro",
  "Open registration page": "Abrir página de registro",
  "Official state election office": "Autoridad electoral estatal oficial",
  "Contact election office": "Contactar a la autoridad electoral",
  "Polling Place": "Casilla de votación",
  "How to Find": "Cómo encontrarla",
  "Find Your Polling Place": "Encuentra tu casilla",
  "Use the official government tool to locate your assigned polling place based on your registered address.":
    "Usa la herramienta oficial del gobierno para localizar la casilla que te corresponde según tu dirección registrada.",
  "Start Date": "Fecha de inicio",
  "End Date": "Fecha de término",
  "Available": "Disponible",
  "Not available": "No disponible",
  "Absentee / Mail Voting": "Voto en ausencia / por correo",
  "No-Excuse Absentee": "Voto en ausencia sin justificación",
  "Any voter can request mail ballot": "Cualquier votante puede solicitar boleta por correo",
  "Must provide qualifying reason": "Se requiere una causa justificada",
  "Voter ID Requirements": "Requisitos de identificación",
  "Photo ID Required": "Se requiere identificación con foto",
  "Accepted Forms": "Formas aceptadas",
  "Available at polls": "Disponible en la casilla",
  "Information": "Información",
  "Yes": "Sí",
  "No": "No",

  // ── Parties ───────────────────────────────────────────────────────
  "Major U.S. political parties — presented without bias":
    "Los principales partidos políticos de EE. UU., presentados sin sesgo",
  "Founded": "Fundado en",
  "About": "Acerca de",
  "Platform": "Plataforma",
  "Leadership": "Dirigencia",
  "Current Leadership": "Dirigencia actual",
  "Key Platform Areas": "Ejes principales de la plataforma",
  "Open Website": "Abrir sitio web",
  "This information is sourced from publicly available records and official party materials. UDecide does not endorse or rank any political party.":
    "Esta información proviene de registros públicos y materiales oficiales de los partidos. UDecide no respalda ni clasifica a ningún partido político.",
  "UDecide presents all political parties without bias, ranking, or endorsement. Information is sourced from official party materials and nonpartisan reference sources.":
    "UDecide presenta a todos los partidos políticos sin sesgo, clasificación ni respaldo. La información proviene de materiales oficiales de los partidos y de fuentes de referencia imparciales.",

  // ── Political guide / quiz / questionnaire ────────────────────────
  "Nonpartisan civic education": "Educación cívica imparcial",
  "Nonpartisan civic education based on official U.S. government sources.":
    "Educación cívica imparcial basada en fuentes oficiales del gobierno de EE. UU.",
  "This educational content is based on official U.S. government sources and nonpartisan civic education materials.":
    "Este contenido educativo se basa en fuentes oficiales del gobierno de EE. UU. y materiales imparciales de educación cívica.",
  "Political System Guide": "Guía del sistema político",
  "Question": "Pregunta",
  "of": "de",
  "Next Question": "Siguiente pregunta",
  "See Results": "Ver resultados",
  "Your results": "Tus resultados",
  "Perfect score!": "¡Puntuación perfecta!",
  "Great job!": "¡Muy bien hecho!",
  "Nice effort!": "¡Buen esfuerzo!",
  "Keep learning!": "¡Sigue aprendiendo!",
  "Retake Quiz": "Repetir el quiz",
  "Back to Home": "Volver al inicio",
  "Loading questions…": "Cargando preguntas…",
  "No Questions": "No hay preguntas",
  "No quiz questions available.": "No hay preguntas de quiz disponibles.",
  "Couldn't load quiz": "No se pudo cargar el quiz",
  "Failed to load quiz": "No se pudo cargar el quiz",
  "Issue Questionnaire": "Cuestionario de temas",
  "Explore where you stand on the issues": "Descubre tu postura en los temas",
  "No issue questions are available right now.": "No hay preguntas de temas disponibles por ahora.",
  "We couldn't load the questionnaire right now.": "No pudimos cargar el cuestionario en este momento.",
  "Failed to load questionnaires": "No se pudieron cargar los cuestionarios",
  "Your selections are kept on this device to help you reflect on where you stand. UDecide does not rank or endorse any stance.":
    "Tus respuestas se guardan en este dispositivo para ayudarte a reflexionar sobre tu postura. UDecide no clasifica ni respalda ninguna posición.",

  // ── Polls ─────────────────────────────────────────────────────────
  "Community perspectives — not scientific unless stated":
    "Perspectivas de la comunidad; no científicas salvo que se indique",
  "No Polls": "No hay encuestas",
  "No polls available for this topic.": "No hay encuestas para este tema.",
  "We couldn't load polls right now.": "No pudimos cargar las encuestas en este momento.",
  "Failed to load polls": "No se pudieron cargar las encuestas",
  "Failed to record vote": "No se pudo registrar tu voto",
  "Tap an option to vote": "Toca una opción para votar",
  "votes": "votos",
  "Poll Results": "Resultados de encuestas",
  "Outcomes from previous community polls": "Resultados de encuestas anteriores de la comunidad",
  "There are no poll results to show yet.": "Aún no hay resultados de encuestas para mostrar.",
  "No Results": "Sin resultados",
  "We couldn't load poll results right now.": "No pudimos cargar los resultados en este momento.",
  "Failed to load poll results": "No se pudieron cargar los resultados",
  "Polls are for informational engagement only and are not scientific unless explicitly stated.":
    "Las encuestas son solo de participación informativa y no son científicas salvo que se indique explícitamente.",
  "Community poll — results reflect app users and are not a scientific sample.":
    "Encuesta comunitaria: los resultados reflejan a los usuarios de la app y no son una muestra científica.",
  "Economy": "Economía",
  "Healthcare": "Salud",
  "Immigration": "Migración",
  "Education": "Educación",
  "Climate": "Clima",
  "Foreign Policy": "Política exterior",
  "Technology": "Tecnología",
  "Voting Access": "Acceso al voto",

  // ── Fact checker ──────────────────────────────────────────────────
  "Nonpartisan · Powered by Gemini AI": "Imparcial · Con tecnología de Gemini AI",
  "Analyzing...": "Analizando...",
  "Suggested:": "Sugerencias:",
  "Ask about a political claim, bill, or government process...":
    "Pregunta sobre una afirmación política, una iniciativa o un proceso de gobierno...",
  "Summarize a bill in plain English": "Resume una iniciativa en lenguaje sencillo",
  "What does the Electoral College do?": "¿Qué hace el Colegio Electoral?",
  "Explain how a bill becomes law": "Explica cómo una iniciativa se convierte en ley",
  "What are the three branches of government?": "¿Cuáles son los tres poderes del gobierno?",
  "How do I check my voting record?": "¿Cómo consulto mi historial de votación?",
  "Welcome to UDecide's nonpartisan Fact Checker, powered by Gemini AI.\n\nI can help you:\n• Understand government processes and legislation\n• Fact-check political claims against public records\n• Summarize bills in plain language\n• Explain voting records neutrally\n\nI remain strictly neutral and do not endorse any candidate, party, or policy. What would you like to know?":
    "Te damos la bienvenida al Verificador de datos imparcial de UDecide, con tecnología de Gemini AI.\n\nPuedo ayudarte a:\n• Entender procesos de gobierno y legislación\n• Verificar afirmaciones políticas contra registros públicos\n• Resumir iniciativas en lenguaje sencillo\n• Explicar historiales de votación con neutralidad\n\nMe mantengo estrictamente neutral y no respaldo a ningún candidato, partido o política. ¿Qué te gustaría saber?",
  "Session limit reached": "Límite de la sesión alcanzado",
  "You've reached the limit of": "Alcanzaste el límite de",
  "questions for this session. Leave and reopen the Fact Checker to start a new session.":
    "preguntas en esta sesión. Sal y vuelve a abrir el Verificador de datos para iniciar una nueva sesión.",
  "Demo mode — no AI key is configured on the server, so responses are samples. Set GEMINI_API_KEY on the API Server for live AI responses.":
    "Modo de demostración: el servidor no tiene configurada una clave de IA, así que las respuestas son de muestra. Configura GEMINI_API_KEY en el servidor para respuestas de IA en vivo.",
  "The AI service is unavailable. Please try again.":
    "El servicio de IA no está disponible. Inténtalo de nuevo.",
  "AI service error": "Error del servicio de IA",

  // ── Profile ───────────────────────────────────────────────────────
  "Account Information": "Información de la cuenta",
  "Account Settings": "Configuración de la cuenta",
  "Edit Profile": "Editar perfil",
  "Save Changes": "Guardar cambios",
  "Not set": "Sin definir",
  "User": "Usuario",
  "Support": "Soporte",
  "About Us": "Acerca de nosotros",
  "Privacy Policy": "Aviso de privacidad",
  "Terms & Conditions": "Términos y condiciones",
  "Send Feedback": "Enviar comentarios",
  "Contact Us": "Contáctanos",
  "UDecide App Feedback": "Comentarios sobre la app UDecide",
  "UDecide Support Request": "Solicitud de soporte de UDecide",
  "Delete Account": "Eliminar cuenta",
  "Delete": "Eliminar",
  "This permanently deletes your account and all associated data. This action cannot be undone.":
    "Esto elimina permanentemente tu cuenta y todos los datos asociados. Esta acción no se puede deshacer.",
  "Unable to delete your account. Please try again.":
    "No se pudo eliminar tu cuenta. Inténtalo de nuevo.",
  "Unable to save your profile. Please try again.":
    "No se pudo guardar tu perfil. Inténtalo de nuevo.",
  "Unable to upload your photo. Please try again.":
    "No se pudo subir tu foto. Inténtalo de nuevo.",
  "Photo library access is needed to choose a profile photo.":
    "Se necesita acceso a tu galería para elegir una foto de perfil.",
  "You must be signed in to delete your account.": "Debes iniciar sesión para eliminar tu cuenta.",
  "You must be signed in to save your profile.": "Debes iniciar sesión para guardar tu perfil.",
  "You must be signed in to update your photo.": "Debes iniciar sesión para actualizar tu foto.",
  "Couldn't open your email app. Reach us at": "No se pudo abrir tu app de correo. Escríbenos a",

  // ── Address override ──────────────────────────────────────────────
  "View political data for another location": "Consulta datos políticos de otra ubicación",
  "View political data for a different location without changing your profile":
    "Consulta datos políticos de otra ubicación sin cambiar tu perfil",
  "Override Active": "Ubicación alternativa activa",
  "Currently viewing:": "Viendo actualmente:",
  "Viewing data for:": "Viendo datos de:",
  "Set Override Location": "Definir ubicación alternativa",
  "Apply Override": "Aplicar ubicación",
  "Reset": "Restablecer",
  "Use address override to explore representatives, elections, and legislation from any U.S. location. A banner will display while override is active. Your profile address is unchanged.":
    "Usa la ubicación alternativa para explorar representantes, elecciones y legislación de cualquier lugar de EE. UU. Se mostrará un aviso mientras esté activa. La dirección de tu perfil no cambia.",
  "All locations": "Todas las ubicaciones",
  "Your state": "Tu estado",
  "your state": "tu estado",
  "your area": "tu zona",
  "Set your location": "Define tu ubicación",

  // ── Web view / static pages / misc ────────────────────────────────
  "Open in Browser": "Abrir en el navegador",
  "Open in app": "Abrir en la app",
  "Opening in a new tab": "Abriendo en una nueva pestaña",
  "doesn't allow being shown inside the app on the web, so it opens in a new browser tab. On the mobile app it opens right here in-app.":
    "no permite mostrarse dentro de la app en la web, así que se abre en una nueva pestaña del navegador. En la app móvil se abre aquí mismo.",
  "This site may not allow being viewed inside the app. You can retry or open it in your browser.":
    "Es posible que este sitio no permita verse dentro de la app. Puedes reintentar o abrirlo en tu navegador.",
  "This website address could not be opened.": "No se pudo abrir esta dirección web.",
  "Invalid link": "Enlace no válido",
  "Retry": "Reintentar",
  "Go Back": "Regresar",
  "Couldn't load page": "No se pudo cargar la página",
  "Couldn't load this page": "No se pudo cargar esta página",
  "Failed to load page": "No se pudo cargar la página",
  "Please check your connection and try again.": "Revisa tu conexión e inténtalo de nuevo.",
  "Oops!": "¡Ups!",
  "This screen doesn't exist.": "Esta pantalla no existe.",
  "Go to home screen!": "Ir a la pantalla de inicio",
  "Something went wrong": "Algo salió mal",
  "Please reload the app to continue.": "Vuelve a cargar la app para continuar.",
  "Try Again": "Intentar de nuevo",
  "Please try again.": "Inténtalo de nuevo.",
  "Unable to Load Data": "No se pudieron cargar los datos",
  "Request failed": "La solicitud falló",
  "on": "el",
};
