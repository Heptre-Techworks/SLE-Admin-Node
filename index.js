const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
var admin = require("firebase-admin");

var serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://social-23e2e.firebaseio.com"
});


const app = express();
app.use(cors());
app.use(express.json());

// Function to extract table data from a given link
async function extractTableData(link) {
  try {
    const response = await axios.get(link);
    if (response.status === 200) {
      const $ = cheerio.load(response.data);

      // Find the table by any means (class, ID, or any selector).
      const table = $('table'); // You can use a specific selector here if needed.

      const tableData = [];

      const headers = [];

      table.find('tr').each((rowIndex, row) => {
        const columns = $(row).find('td'); // You can change 'td' to 'th' or other selectors if needed.

        if (columns.length > 0) {
          const rowData = {};

          columns.each((colIndex, column) => {
            if (rowIndex === 0) {
              // Handle the header row
              headers.push($(column).text().trim());
            } else {
              // Handle the data rows
              rowData[headers[colIndex]] = $(column).text().trim();
            }
          });

          if (rowIndex > 0) {
            tableData.push(rowData);
          }
        }
      });

      return tableData;
    } else {
      console.error('Failed to fetch the page.');
      return null;
    }
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

// Route to insert data into Firebase Realtime Database
const encodeFirebaseKey = (key) => {
  // Encode the key to replace forbidden characters
  return key.replace(/[.#$[\]/]/g, (match) => {
    return {
      '.': ',',
      '#': '_',
      '$': '-',
      '[': '(',
      ']': ')',
      '/': '|'
    }[match];
  });
};

const decodeFirebaseKey = (key) => {
  // Decode the key to original form
  return key.replace(/[,_\-()|]/g, (match) => {
    return {
      ',': '.',
      '_': '#',
      '-': '$',
      '(': '[',
      ')': ']',
      '|': '/'
    }[match];
  });
};
//insert data route
app.post('/insertData', async (req, res) => {
  try {
    const { link } = req.body;
    const tableData = await extractTableData(link);

    // Initialize the Firebase Realtime Database reference
    const db = admin.database();
    const ref = db.ref('Component');

    // Iterate through each item in the tableData array
    tableData.forEach((itemData) => {
      // Generate a custom key based on the 'Item' for each item
      const itemKey = encodeFirebaseKey(`Component_${itemData['Item']}`);

      // Set the data using the custom key for each item
      ref.child(itemKey).set({
        'PO Ref': itemData['PO Ref'],
        Drawing: itemData['Drawing'],
        Item: itemData['Item'],
        'Item Rev': itemData['Item Rev'],
        Buyer : itemData['Buyer'],
        'Qty Ordered' : itemData['Qty Ordered'],
        'Qty Due' : itemData['Qty Due'],
        'Due DatePromised Date' : itemData['Due DatePromised Date'],
        'Material Supplier' : itemData['Material Supplier'],
        'Material Available' : itemData['Material Available'],
        Notes : itemData['Notes'],
        MaterialRequired: itemData['MaterialRequired'],
        Current_cost: itemData['Current_cost'],
        MaterialScrap: itemData['MaterialScrap'],
        CostLog: itemData['CostLog'],
        CurrentCost: itemData['CurrentCost'],
        DrawingFileURL: itemData['DrawingFileURL'],
      });
    });

    res.status(200).json({ message: 'Data inserted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Function to fetch data from Firebase
const fetchDataFromFirebase = async () => {
  try {
    const db = admin.database();
    const ref = db.ref('Component');

    const snapshot = await ref.once('value');
    return snapshot.val();
  } catch (error) {
    throw error;
  }
};

// API endpoint to fetch data
app.get('/api/fetch-data', async (req, res) => {
  try {
    const data = await fetchDataFromFirebase();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


//const link = 'https://www.valves.co.uk/vendor/link.php?link=Msd5OEAEWGBH8No6O6cD'
//extractTableData(link)



// async function extractTableData(link) {
//   try {
//     const response = await axios.get(link);
//     if (response.status === 200) {
//       const $ = cheerio.load(response.data);

//       // Find the table by any means (class, ID, or any selector).
//       const table = $('table'); // You can use a specific selector here if needed.

//       const tableData = [];

//       table.find('tr').each((rowIndex, row) => {
//         const columns = $(row).find('td'); // You can change 'td' to 'th' or other selectors if needed.

//         if (columns.length > 0) {
//           const rowData = {};

//           columns.each((colIndex, column) => {
//             rowData[`Column ${colIndex + 1}`] = $(column).text().trim();
//           });

//           tableData.push(rowData);
//         }
//       });

//       return tableData;
//     } else {
//       console.error('Failed to fetch the page.');
//       return null;
//     }
//   } catch (error) {
//     console.error('Error:', error);
//     return null;
//   }
// }

// // Example usage:
// extractTableData('https://www.valves.co.uk/vendor/link.php?link=Msd5OEAEWGBH8No6O6cD')
//   .then((result) => {
//     if (result) {
//       console.log('Table Data:', result);
//     } else {
//       console.log('No data extracted.');
//     }
//   })
//   .catch((error) => {
//     console.error('Error:', error);
//   });



// Export the Express API
module.exports = app