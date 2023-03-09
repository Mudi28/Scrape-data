import axios from 'axios'
import { load } from 'cheerio'
import minimist from 'minimist'
import fs from 'fs'
import path from 'path'
import os from 'os'
// set to keep track of visited pages
const visitedPages = new Set()
// array to store products
const products = []
// function to generate a random page number between 1 and totalPages
async function getRandomPageNumber(totalPages) {
  return Math.floor(Math.random() * totalPages) + 1
}
// this function scrapes data using the axios and cheerio libraries
async function scrapeData(pageNumber) {
  try {
    // make an HTTP GET request to the specified URL expecting a response
    const response = await axios.get(
      `https://scrapeme.live/shop/page/${pageNumber}`,
    )
    // extract the HTML content from the request response
    const html = response.data
    // loading HTML content in the cheerio document
    const $ = load(html)
    // Selects all DOM elements with the class 'product'
    const productElements = $('.product')
    // iterate through each product element.
    for (let i = 0; i < productElements.length; i++) {
      // extract product name,image,url,price from the element
      const element = productElements[i]
      const name = $(element).find('.woocommerce-loop-product__title').text()
      const image = $(element).find('img').attr('src')
      const url = $(element)
        .find('a.woocommerce-LoopProduct-link.woocommerce-loop-product__link')
        .attr('href')
      const price = $(element).find('span.price').text()
      // create a product object containing the extracted information
      const product = {
        name: name,
        image: image,
        url: url,
        price: price,
      }
      //add the product object to the product array.
      products.push(product)
    }

    console.log(`Page ${pageNumber} done!`)
    // export the products array to a json/csv file
    await exportData()
  } catch (error) {
    console.error(error)
  }
}
// function to get the total number of pages to be scraped
async function getTotalPages() {
  try {
    // make an HTTP GET request to the specified URL expecting a response
    const response = await axios.get('https://scrapeme.live/shop/page/1/')
    // extract the HTML content from the request response
    const html = response.data
    // loading HTML content in the cheerio document
    const $ = load(html)
    // extract the total number of pages
    const totalPages = parseInt(
      $('.page-numbers:not(.prev):not(.next)').last().text(),
    )

    console.log(totalPages)
    // loop through random pages until all pages have been visited
    while (visitedPages.size < totalPages) {
      // generate a random page number using the `getRandomPageNumber` function
      const randomPageNumber = await getRandomPageNumber(totalPages)
      // check if the random page number has not been visited before
      if (!visitedPages.has(randomPageNumber)) {
        // add the random page number to the set of visited pages
        visitedPages.add(randomPageNumber)
        // call the `scrapeData` function with the random page number as an argument
        await scrapeData(randomPageNumber)
      }
    }

    console.log(`Scraping done for ${visitedPages.size} pages!`)
  } catch (error) {
    console.error(error)
  }
}

getTotalPages()

// this function exportData using the minimist library
async function exportData() {
  // parse command line arguments using minimist
  const args = minimist(process.argv.slice(2), {
    string: ['export_format'], // 'export' as a string argument
    alias: { e: 'export_format' }, // '-e' as an alias for 'export'
  })

  // check if the `--export_format` argument is provided and its value
  const exportFormat = args.export_format && args.export_format.toUpperCase()
  if (!exportFormat) {
    // if export format is not specified, don't export anything
    return
  }

  // create a folder for the exported files, if it doesn't already exist
  const folderPath = path.join(process.cwd(), 'export-data')
  try {
    await fs.promises.mkdir(folderPath, { recursive: true })
    console.log(`Directory ${folderPath} found successfully!`)
  } catch (error) {
    console.error(`Error creating directory: ${error}`)
  }

  // export data to a json file
  if (exportFormat === 'JSON') {
    const jsonData = JSON.stringify(products)
    const filePath = path.join(folderPath, 'product.json')
    try {
      await fs.promises.writeFile(filePath, jsonData)
      console.log('Correct export format. Data exported to product.json')
    } catch (error) {
      console.log('Error exporting data:', error)
    }

    // export data to a csv file
  } else if (exportFormat === 'CSV') {
    const csvData = `name,image,url,price${os.EOL}${products
      .map(
        (product) =>
          `${product.name},${product.image},${product.url},${product.price}`,
      )
      .join(os.EOL)}`
    const filePath = path.join(folderPath, 'product.csv')
    try {
      await fs.promises.writeFile(filePath, csvData)
      console.log('Correct export format. Data exported to product.csv')
    } catch (error) {
      console.log('Error exporting data:', error)
    }
  } else if (exportFormat) {
    console.error('Invalid export format. Only CSV and JSON are supported.')
  }
}
