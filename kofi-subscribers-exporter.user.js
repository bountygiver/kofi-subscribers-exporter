// ==UserScript==
// @name         Ko-Fi Monthly Subscriber List Fetcher
// @namespace    https://github.com/bountygiver/kofi-subscribers-exporter
// @version      2024-05-12
// @description  Fetch Ko-Fi Subscribers and process the text
// @author       bountygiver
// @match        https://ko-fi.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=ko-fi.com
// @grant        none
// ==/UserScript==


const custScriptLoadingLabelId = "custScriptLoadingGenSubLabel";
const custScriptButtonId = "custScriptButtonGenSubLabel";

function downloadTransaction(month, callback) {
    const data = {
        selectedMonth: month,
        ledger: 'received',
        transactionType: 'monthly'
    };

    const searchParams = new URLSearchParams(data);
    fetch("https://ko-fi.com/Manage/DownloadTransactionCSV", {
        "headers": {
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "accept-language": "en-US,en;q=0.9,en-CA;q=0.8",
            "cache-control": "max-age=0",
            "content-type": "application/x-www-form-urlencoded",
        },
        "referrer": "https://ko-fi.com/manage/supportreceived?src=sidemenu",
        "body": searchParams.toString(),
        "method": "POST",
        "mode": "cors",
        "credentials": "include"
    }).then((d) => {
        d.text().then(callback);
    }).catch(() => {
        alert("An error occurred when retrieving subscribers, please try again later.");
        $(`#${custScriptLoadingLabelId}`).hide();
        $(`#${custScriptButtonId}`).show();
    });
}

function csvRowToArray(str) {
  const seperator = ','
  const block = '"'
  const columns = [];
  let column = '',
    inQuotes = false;
  if (!str) {
    return null
  }
  for (let i = 0; i < str.length; i++) {
    let letter = str[i];
    if (letter === seperator && !inQuotes) {
      columns.push(column);
      column = '';
      continue;
    }

    if (letter !== block) {
      column += letter;
      continue;
    }

    if (!inQuotes) {
      inQuotes = true;
      continue;
    }

    if (i + 1 < str.length && str[i + 1] === block) {
      i += 1
      column += block;
    } else {
      inQuotes = false;
    }
  }
  columns.push(column);

  return columns;
}

const CSVToArray = (data, omitFirstRow = false) =>
  data
  .slice(omitFirstRow ? data.indexOf('\n') + 1 : 0)
  .split('\n')
  .map(csvRowToArray).filter((v) => v && v.length);

function downloadTxt(data) {
    const blob = new Blob([data], {type: 'text/txt'});
    if(window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveBlob(blob, "subscribers.txt");
    }
    else {
        const elem = window.document.createElement('a');
        elem.href = window.URL.createObjectURL(blob);
        elem.download = "subscribers.txt";
        document.body.appendChild(elem);
        elem.click();
        document.body.removeChild(elem);
    }
}

function main() {
    'use strict';

    let downloadCsv = $("button[data-target='#exportToCsvModal']");
    if (downloadCsv.length && $("#selectedMonth").length) {
        let loadingLabel = $(`<div> Please wait while we are fetching subscribers... This will take around 5 seconds due to anti spam requests ... </div>`);
        loadingLabel.attr("id", custScriptLoadingLabelId);
        let downloadButton = $(`<button type="button" class="kfds-btn-ghost-dark kfds-srf-rounded" style="float: right">
                Generate this month Subscriber Text
            </button>`);
        downloadButton.attr("id", custScriptButtonId);
        loadingLabel.hide();
        downloadButton.on("click", function() {
            $(`#${custScriptLoadingLabelId}`).show();
            $(`#${custScriptButtonId}`).hide();
            loadingLabel.show();
            let thisMonth = $($("#selectedMonth").find("option")[1]).val();
            let lastMonth = $($("#selectedMonth").find("option")[2]).val();

            let monthCutoff = new Date();
            monthCutoff.setMonth(monthCutoff.getMonth() - 1);
            downloadTransaction(thisMonth, function (thisMonthData) {
                setTimeout(function() {
                    downloadTransaction(lastMonth, function (lastMonthData) {
                        let allSubs = CSVToArray(thisMonthData, ',', true).concat(CSVToArray(lastMonthData, ',', true)).filter(s => s && s.length > 3 && new Date(s[0]) > monthCutoff);
                        let groupedSubs = Object.groupBy(allSubs, s => s[3]);
                        let data = "";
                        let subTiers = Object.keys(groupedSubs).toSorted().toReversed();
                        subTiers.forEach(function (t) {
                            data = data + "\n========== " + t + " ==========";
                            groupedSubs[t].toSorted((a, b) => a[1].localeCompare(b[1])).forEach(function (s) {
                                data = data + "\n" + s[1];
                            });
                        });
                        console.log(data);
                        downloadTxt(data);
                        $(`#${custScriptLoadingLabelId}`).hide();
                        $(`#${custScriptButtonId}`).show();
                    });
                }, 5000);
            });
        });
        downloadCsv.after(downloadButton);
        downloadCsv.after(loadingLabel);
    }
}

main();
