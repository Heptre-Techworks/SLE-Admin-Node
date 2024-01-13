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

// API endpoint to insert data into Firebase Realtime Database
// API endpoint to insert data into Firebase Realtime Database
// app.post('/insertData', async (req, res) => {
//   try {
//     const { link } = req.body;
//     const tableData = await extractTableData(link);

//     // Initialize the Firebase Realtime Database reference
//     const db = admin.database();
//     const ref = db.ref('PORef');

//     // Create a map to group data by PO Ref
//     const groupedData = [];

//     // Iterate through each item in the tableData array
//     tableData.forEach((itemData) => {
//       // Extract the PO Ref and Main part
//       const [poRef, refValue] = itemData['PO Ref']?.split(' / ') || [];
//       if (poRef) {
//         // Generate a custom key based on the 'Item' for each item
//         const itemKey = poRef; // Use the PO Ref as the key

//         // Split "Due DatePromised Date" into "Due Date" and "Promised Date"
//         const datePromised = itemData['Due DatePromised Date'];
//         let dueDate, promisedDate;

//         if (datePromised.length >= 16) {
//           dueDate = datePromised.substring(0, 10);
//           promisedDate = datePromised.substring(10, 20);
//         } else if (datePromised.length >= 8) {
//           dueDate = datePromised.substring(0, 8);
//           promisedDate = '';
//         } else {
//           dueDate = '';
//           promisedDate = '';
//         }

//         // Create an object to store the data for this item
//         const itemDataToInsert = {
//           'PO Ref': itemData['PO Ref'] || '',
//           Drawing: itemData['Drawing'] || '',
//           Item: itemData['Item'] || '',
//           'Item Rev': itemData['Item Rev'] || '',
//           Buyer: itemData['Buyer'] || '',
//           'Qty Ordered': itemData['Qty Ordered'] || '',
//           'Due Date': dueDate,  // Use sliced "Due Date"
//           'Promised Date': promisedDate,  // Use sliced "Promised Date"
//           'Material Supplier': itemData['Material Supplier'] || '',
//           'Material Available': itemData['Material Available'] || '',
//           Notes: itemData['Notes'] || '',
//           MaterialRequired: itemData['MaterialRequired'] || '',
//           Current_cost: itemData['Current_cost'] || '',
//           MaterialScrap: itemData['MaterialScrap'] || '',
//           CostLog: itemData['CostLog'] || '',
//           CurrentCost: itemData['CurrentCost'] || '',
//           DrawingFileURL: itemData['DrawingFileURL'] || '',
//           DeliveryStatus: itemData['DeliveryStatus'] || '',
//         };

//         // Add the item data to the groupedData array
//         const poRefIndex = groupedData.findIndex((group) => group.poRef === poRef);
//         if (poRefIndex === -1) {
//           groupedData.push({ poRef, items: [itemDataToInsert] });
//         } else {
//           groupedData[poRefIndex].items.push(itemDataToInsert);
//         }
//       }
//     });

//     // Insert the grouped data into Firebase
//     groupedData.forEach((group) => {
//       // Create a reference for each PO Ref
//       const poRefRef = ref.child(group.poRef);

//       // Set the data for the PO Ref
//       poRefRef.set(group.items);
//     });

//     res.status(200).json({ message: 'Data inserted successfully' });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

app.post('/insertData', async (req, res) => {
  try {
    const { link } = req.body;
    const tableData = await extractTableData(link);
    
    // Initialize the Firebase Realtime Database reference
    const db = admin.database();
    const ref = db.ref('PORef');

    // Create an object to store data grouped by PO Ref
    const groupedData = {};

    // Iterate through each item in the tableData array
    tableData.forEach((itemData) => {
      // Extract the PO Ref and Main part
      const [poRef, refValue] = itemData['PO Ref']?.split(' / ') || [];
      if (poRef) {
        // Generate a custom key based on the 'Item' for each item
        const itemKey = itemData['PO Ref'].replace('/', '-'); // Use the PO Ref as the key

        // Split "Due DatePromised Date" into "Due Date" and "Promised Date"
        const datePromised = itemData['Due DatePromised Date'];
        let dueDate, promisedDate;

        if (datePromised.length >= 16) {
          dueDate = datePromised.substring(0, 10);
          promisedDate = datePromised.substring(10, 20);
        } else if (datePromised.length >= 8) {
          dueDate = datePromised.substring(0, 8);
          promisedDate = '';
        } else {
          dueDate = '';
          promisedDate = '';
        }

        // Create an object to store the data for this item
        const itemDataToInsert = {
          'PO Ref': itemData['PO Ref'] || '',
          Drawing: itemData['Drawing'] || '',
          Item: itemData['Item'] || '',
          'Item Rev': itemData['Item Rev'] || '',
          Buyer: itemData['Buyer'] || '',
          'Qty Ordered': itemData['Qty Ordered'] || '',
          'Due Date': dueDate,  // Use sliced "Due Date"
          'Promised Date': promisedDate,  // Use sliced "Promised Date"
          'Material Supplier': itemData['Material Supplier'] || '',
          'Material Available': itemData['Material Available'] || '',
          Notes: itemData['Notes'] || '',
          MaterialRequired: itemData['MaterialRequired'] || '',
          Current_cost: itemData['Current_cost'] || '',
          MaterialScrap: itemData['MaterialScrap'] || '',
          CostLog: itemData['CostLog'] || '',
          CurrentCost: itemData['CurrentCost'] || '',
          DrawingFileURL: itemData['DrawingFileURL'] || '',
          DeliveryStatus: itemData['DeliveryStatus'] || '',
        };

        // Add the item data to the groupedData object using PO Ref as the key
        if (!groupedData[poRef]) {
          groupedData[poRef] = {};
        }
        groupedData[poRef][itemKey] = itemDataToInsert;
      }
    });

    // Insert the grouped data into Firebase
    for (const poRef in groupedData) {
      // Create a reference for each PO Ref
      const poRefRef = ref.child(poRef);

      // Set the data for the PO Ref
      poRefRef.set(groupedData[poRef]);
    }

    res.status(200).json({ message: 'Data inserted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// API endpoint to fetch data
app.get('/api/fetch-data', async (req, res) => {
  try {
    const data = await fetchDataFromFirebase();

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Function to fetch data from Firebase
async function fetchDataFromFirebase() {
  try {
    const db = admin.database();
    const ref = db.ref('PORef');

    const snapshot = await ref.once('value');
    const data = snapshot.val();

    return data;
  } catch (error) {
    throw error;
  }
}


// Create a new route for storing the link and checking if it exists in Firebase
app.post('/store-link', async (req, res) => {
  try {
    const { link } = req.body;
    console.log(link);
    const existingData = await fetchDataFromFirebase();

    if (Array.isArray(existingData)) {
      // Check if the link is already stored in Firebase
      const isLinkStored = existingData.includes(link);

      if (isLinkStored) {
        res.status(200).json({ message: 'Link is already stored.' });
      } else {
        // Check if the link is working (you can customize this check)
        const isLinkWorking = true; // Implement your link check logic here

        if (isLinkWorking) {
          // If the link is working, store it in Firebase
          const db = admin.database();
          
          // Directly set the link using "vendorLink" as the key
          db.ref('VendorLinks').set(link);

          res.status(200).json({ message: 'Link stored successfully' });
        } else {
          // If the link is not working, return an error
          res.status(400).json({ error: 'Link is not working.' });
        }
      }
    } else {
      // If "existingData" is not an array or doesn't exist, create a new "VendorLinks" node and store the link
      const db = admin.database();
      db.ref('VendorLinks').set(link);

      res.status(200).json({ message: 'Link stored successfully' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Function to check if the link body contains a table
function containsTable(body) {
  // Regular expression to match an HTML table element
  const tableRegex = /<table[\s\S]*?<\/table>/i;

  // Test if the body contains a table using the regular expression
  return tableRegex.test(body);
}

// API endpoint to fetch the link status from Firebase
app.get('/api/fetch-link', async (req, res) => {
  try {
    const link = await fetchLinkFromFirebase(); // Implement this function to fetch the link content
    console.log('api/fetch-link',link)
    if (!link) {
      res.status(404).json({ linkStatus: "not_found" });
    } else if (isLinkExpired(link)) {
      res.status(200).json({ linkStatus: "expired" });
    } else {
      res.status(200).json({ linkStatus: "valid" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Function to fetch the link content from Firebase (implement this function)
async function fetchLinkFromFirebase() {
  try {
    const db = admin.database();
    const ref = db.ref('VendorLinks'); // Assuming you store the link under 'VendorLinks'

    const snapshot = await ref.once('value');
    console.log(snapshot.val());
    return snapshot.val();
  } catch (error) {
    throw error;
  }
}

// Function to check if the link is expired
function isLinkExpired(link) {
  // Load the link's body content using Cheerio
  const $ = cheerio.load(link);

  // Define the expected expiration message
  const expirationMessage = 'The link you have provided is no longer valid. If you feel this is in error, please contact Vendor Support.';

  console.log('body',$('body').text())
  // Check if the body contains the expected expiration message
  const messageFound = $('body').text().includes(expirationMessage);

  // Check if the link body doesn't contain a table or contains the expiration message
  return !containsTable(link.body) || messageFound;
}



app.post('/updateDeliveryStatus', async (req, res) => {
  try {
    const { poRef, deliveryStatus,selectedPoRef } = req.body;

    const poref = poRef.replace('/', '-');
    console.log('test',poref)


    // Initialize the Firebase Realtime Database reference
    const db = admin.database();
    const ref = db.ref('PORef').child(selectedPoRef).child(poref);

    

    // Update the "Delivery Status" for the selected item
    ref.child('DeliveryStatus').set(deliveryStatus);

    res.status(200).json({ message: 'Delivery Status updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});





const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
