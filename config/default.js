"use strict";

const fs = require("fs");

module.exports = {
  server: {
    port: 3000
  },
  secrets: {
    jwt: {
      signature: "12345678901234567890",
      caducity: "7 days"
    }
  },
  azure: {
    MedicalInfoAccessRole: "[put your value here]",
    auth: {
      credentials: {
        tenantId: "[put your value here]",
        clientId: "[put your value here]",
        secret: "[put your value here]",
        UPN: "",
        Passwd: ""
      }
    }
  },
  firebase: {
    auth: {
      credentials: require(process.env["NODE_CONFIG_DIR"] +
        "/firebase-credentials.json")
    },
    requireValidatedMail: false
  },
  aws: {
    bucket: "[put your value here]",
    table_name: "[put your value here]",
    QueueUrl: "[put your value here]",
    MessageRetentionPeriod: 60,
    filetypes: [
      { ext: "tar.gz", access: "readonly" },
      { ext: "bam", access: "readonly" },
      { ext: "bai", access: "readonly" },
      { ext: "pdf", access: "readonly", send_notification: true }
    ],
    auth: {
      credentials: {
        region: "[put your value here]",
        accessKeyId: "[put your value here]",
        secretAccessKey: "[put your value here]"
      }
    }
  },
  fakeLogin: false,
  debug: true
};
