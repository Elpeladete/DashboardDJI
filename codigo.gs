// Configuration
// It's better to use PropertiesService for the token
function getAsanaToken() {
  // Try to get from properties first
  const token = PropertiesService.getScriptProperties().getProperty('ASANA_TOKEN');
  // If not found, use the hardcoded one (not recommended for production)
  return token || "YOUR_ASANA_ACCESS_TOKEN"; 
}

const WORKSPACE_GID = "9620850264019";
const PROJECT_GID = "1209048018419206";

// Custom field GIDs
const CUSTOM_FIELDS = {
  distributor: "1209111962709656",
  caseNumber: "1209448009902606",
  ticketStatus: "1209332254518999",
  lastUpdate: "1209048018419298",
  djiEntryDate: "1209951587984333",
  garantiaDJI: "1209048018419298"
};

// Section IDs
const SECTIONS = [
  {
    gid: "1209048018419207",
    name: "Garantias DJI",
    resource_type: "section",
  },
  {
    gid: "1209525673160685",
    name: "Viejos - Revision Urgente",
    resource_type: "section",
  },
  {
    gid: "1209792043819698",
    name: "Casos escalados",
    resource_type: "section",
  },
  {
    gid: "1209048018419351",
    name: "Pendientes enviar piezas",
    resource_type: "section",
  },
  {
    gid: "1209897696658740",
    name: "ENVIADOS A DEPOSITO",
    resource_type: "section",
  },
  {
    gid: "1209048018419352",
    name: "Finalizadas",
    resource_type: "section",
  },
  {
    gid: "1209938778894096",
    name: "Pruebas de Martín A.",
    resource_type: "section",
  }
];

// User authentication data (for simplicity, hardcoded here)
const USERS = {
  "Aconcagro": { password: "345sdfvgb", distributor: "Aconcagro" },
  "Agrix": { password: "23werfg", distributor: "Agrix" },
  "Agrodiesel": { password: "rfdvc45", distributor: "Agrodiesel" },
  "Agrodrones TL": { password: "987uihjmn", distributor: "Agrodrones TL" },
  "Agronix": { password: "987yughf", distributor: "Agronix" },
  "Arduini": { password: "213lcsd", distributor: "Arduini Maximiliano" },
  "Arán Tecnologías": { password: "67uytrgfd", distributor: "Arán Tecnologías" },
  "Bianchini Precisión": { password: "43erfdsr34", distributor: "Bianchini Precisión" },
  "Crontab": { password: "1qwsadfgt", distributor: "Crontab S.A." },
  "Kampu": { password: "09876ytg", distributor: "Kampu" },
  "Lucas Preisz": { password: "lkmojiht76", distributor: "Lucas Preisz" },
  "Pauny": { password: "23wdfcvds", distributor: "Pauny" },
  "Ralch": { password: "9273vgcfdes", distributor: "Ralch SA" },
  "Vamagro": { password: "olkiujy653", distributor: "Vamagro" },
  "soporte@dyesa.com": { password: "PostVentaDyE", distributor: "all" },
  "iespinosa@dyesa.com": { password: "EspinosaI", distributor: "all" },
  "maused@dyesa.com": { password: "AusedM", distributor: "all" },
  "comercial": { password: "comercialDJI", distributor: "all" }
};

/**
 * Authenticates a user based on username and password.
 */
function authenticateUser(username, password) {
  const user = USERS[username];
  if (user && user.password === password) {
    return { success: true, distributor: user.distributor };
  }
  return { success: false, message: "Usuario o contraseña incorrectos" };
}

/**
 * Serves the HTML page
 */
function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Dashboard DJI - PostVenta - D&E')
    .setFaviconUrl('https://i.ibb.co/zhBxGWLt/SP-Icon.png')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Test function to check if the script is working
 */
function testConnection() {
  return {
    success: true,
    message: "Connection to Google Apps Script is working!",
    timestamp: new Date().toString()
  };
}

/**
 * Fetches tasks for all sections
 */
function getAllTasks() {
  try {
    Logger.log("Starting getAllTasks function");
    const token = getAsanaToken();
    
    if (!token || token === "YOUR_ASANA_ACCESS_TOKEN") {
      Logger.log("Error: Asana token not configured");
      return { 
        error: "Asana access token is not configured. Please set up your token in the script." 
      };
    }
    
    const sectionsWithTasks = [];
    
    // Test with just one section first to isolate issues
    const testSection = SECTIONS[0];
    try {
      Logger.log("Fetching tasks for test section: " + testSection.name);
      const tasks = fetchTasksForSection(testSection.gid, token);
      Logger.log("Successfully fetched " + tasks.length + " tasks for test section");
      sectionsWithTasks.push({
        section: testSection,
        tasks: tasks
      });
    } catch (error) {
      Logger.log("Error fetching tasks for test section: " + error.toString());
      sectionsWithTasks.push({
        section: testSection,
        tasks: [],
        error: "Failed to fetch tasks for this section: " + error.toString()
      });
    }
    
    // If test section worked, fetch the rest
    if (sectionsWithTasks[0].tasks.length > 0) {
      Logger.log("Test section successful, fetching remaining sections");
      for (let i = 1; i < SECTIONS.length; i++) {
        const section = SECTIONS[i];
        try {
          const tasks = fetchTasksForSection(section.gid, token);
          sectionsWithTasks.push({
            section: section,
            tasks: tasks
          });
        } catch (error) {
          Logger.log("Error fetching tasks for section " + section.name + ": " + error.toString());
          sectionsWithTasks.push({
            section: section,
            tasks: [],
            error: "Failed to fetch tasks for this section: " + error.toString()
          });
        }
      }
    }
    
    Logger.log("Completed getAllTasks, returning " + sectionsWithTasks.length + " sections");
    return sectionsWithTasks;
  } catch (error) {
    Logger.log("Critical error in getAllTasks: " + error.toString());
    return { 
      error: "Error fetching tasks: " + error.toString(),
      stack: error.stack
    };
  }
}

/**
 * Fetches tasks for a specific section
 */
function fetchTasksForSection(sectionGid, token) {
  Logger.log("Starting fetchTasksForSection for section: " + sectionGid);
  
  const url = `https://app.asana.com/api/1.0/sections/${sectionGid}/tasks?opt_fields=name,completed,due_on,created_at,modified_at,notes,assignee,permalink_url,custom_fields`;
  
  Logger.log("Fetching URL: " + url);
  
  const options = {
    method: 'get',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    },
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    Logger.log("Response code: " + responseCode);
    
    if (responseCode !== 200) {
      Logger.log("Error response: " + responseText);
      throw new Error(`Failed to fetch tasks: ${responseCode} ${responseText}`);
    }
    
    const data = JSON.parse(responseText);
    
    if (!data.data || !Array.isArray(data.data)) {
      Logger.log("Invalid data format received: " + JSON.stringify(data));
      return [];
    }
    
    Logger.log("Successfully fetched " + data.data.length + " tasks");
    
    // Process the tasks to extract custom field values
    const processedTasks = data.data.map(function(task) {
      // Extract custom field values
      const customFieldValues = {};
      
      if (task.custom_fields && Array.isArray(task.custom_fields)) {
        task.custom_fields.forEach(function(field) {
          // Store the custom field value based on its type
          if (field.gid === CUSTOM_FIELDS.distributor) {
            customFieldValues.distributor = field.enum_value ? field.enum_value.name : null;
          }
          if (field.gid === CUSTOM_FIELDS.caseNumber) {
            customFieldValues.caseNumber = field.text_value;
          }
          if (field.gid === CUSTOM_FIELDS.ticketStatus) {
            customFieldValues.ticketStatus = field.enum_value ? field.enum_value.name : null;
          }
          if (field.gid === CUSTOM_FIELDS.lastUpdate) {
            customFieldValues.lastUpdate = field.date_value;
          }
          if (field.gid === CUSTOM_FIELDS.djiEntryDate) {
            // Extraer específicamente el campo 'date' dentro de date_value
            customFieldValues.djiEntryDate = field.date_value && field.date_value.date ? field.date_value.date : null;
          }
          if (field.gid === CUSTOM_FIELDS.garantiaDJI) {
            customFieldValues.garantiaDJI = field.text_value;
          }
        });
      }
      
      // Return the task with custom field values
      return {
        gid: task.gid,
        name: task.name,
        completed: task.completed,
        due_on: task.due_on,
        created_at: task.created_at,
        modified_at: task.modified_at,
        notes: customFieldValues.garantiaDJI,
        assignee: task.assignee,
        permalink_url: task.permalink_url,
        customFieldValues: customFieldValues
      };
    });
    
    return processedTasks;
  } catch (error) {
    Logger.log("Error in fetchTasksForSection: " + error.toString());
    throw error;
  }
}

/**
 * Filters tasks based on the distributor associated with the authenticated user.
 */
function getTasksForDistributor(distributor) {
  const allTasks = getAllTasks();

  if (allTasks.error) {
    return { error: allTasks.error };
  }

  if (distributor === "all") {
    return allTasks;
  }

  const filteredTasks = allTasks.map(section => {
    const tasks = section.tasks.filter(task =>
      task.customFieldValues && task.customFieldValues.distributor === distributor
    );
    return { ...section, tasks };
  });

  return filteredTasks.filter(section => section.tasks.length > 0);
}

/**
 * Gets all unique distributors from the tasks
 */
function getDistributors() {
  try {
    const allTasks = getAllTasks();
    
    // Check if there was an error
    if (allTasks.error) {
      return { error: allTasks.error };
    }
    
    const distributors = new Set();
    
    allTasks.forEach(function(section) {
      if (section.tasks && Array.isArray(section.tasks)) {
        section.tasks.forEach(function(task) {
          if (task.customFieldValues && task.customFieldValues.distributor) {
            distributors.add(task.customFieldValues.distributor);
          }
        });
      }
    });
    
    return Array.from(distributors).sort();
  } catch (error) {
    Logger.log("Error getting distributors: " + error.toString());
    return { error: "Error getting distributors: " + error.toString() };
  }
}

/**
 * Include external CSS or JS files
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Get the execution logs for debugging
 */
function getLogs() {
  return Logger.getLog();
}