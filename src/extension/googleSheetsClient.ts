import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { JWT } from 'google-auth-library';
import { GoogleSpreadsheet, type GoogleSpreadsheetWorksheet } from 'google-spreadsheet';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

/**
 * data/credentials/ 配下の最初の .json ファイルパスを返す。ファイル名は問わない。
 * ここではパスのみを扱い、鍵の中身は読み取らない。
 */
export function findCredentialsFile(bundlePath: string): string {
  const dir = join(bundlePath, 'data', 'credentials');
  if (!existsSync(dir)) {
    throw new Error('data/credentials/ が見つかりません');
  }
  const jsonFile = readdirSync(dir).find((f) => f.endsWith('.json'));
  if (!jsonFile) {
    throw new Error('data/credentials/ 配下にサービスアカウントの鍵JSONがありません');
  }
  return join(dir, jsonFile);
}

/**
 * サービスアカウント鍵ファイルのパスから認証済み JWT クライアントを作成する。
 *
 * google-auth-library@10 は `keyFile` のみを渡すと JWT の `iss` クレームが補完されず
 * 空のまま署名され、Google 側で `invalid_grant: account not found` になる
 * （TokenHandler.processCredentials が `email` は復元するが `iss` を更新し直さないため）。
 * そのため `client_email`（秘匿情報ではない）だけを読み取り `email` として明示的に渡す。
 * 秘密鍵(`private_key`)自体はここでは読み取らず、署名は引き続き `keyFile` 経由でライブラリに委ねる。
 */
export function createGoogleAuth(keyFilePath: string): JWT {
  const { client_email: email } = JSON.parse(readFileSync(keyFilePath, 'utf-8')) as {
    client_email?: string;
  };
  if (!email) {
    throw new Error('鍵JSONに client_email がありません');
  }
  return new JWT({ email, keyFile: keyFilePath, scopes: SCOPES });
}

/** スプレッドシートURLから spreadsheetId を抽出する。 */
export function extractSpreadsheetId(url: string): string {
  const m = /\/d\/([a-zA-Z0-9_-]+)/.exec(url);
  if (!m) {
    throw new Error(`スプレッドシートURLからIDを抽出できません: ${url || '(未設定)'}`);
  }
  return m[1];
}

/** 指定スプレッドシートを取得し、loadInfo まで済ませた GoogleSpreadsheet を返す。 */
export async function getSpreadsheet(spreadsheetId: string, auth: JWT): Promise<GoogleSpreadsheet> {
  const doc = new GoogleSpreadsheet(spreadsheetId, auth);
  await doc.loadInfo();
  return doc;
}

/**
 * ワークシートを取得する。sheetTitle 未指定時のみ先頭シートにフォールバックする。
 *
 * 指定した名前が見つからないときに黙って先頭シートを読むと、シート名の打ち間違いが
 * 「エラー」ではなく「別のシートを読んだ結果 0 件」に化けて配信中のランキングが
 * 静かに壊れる。名前を指定した場合は必ずエラーにする。
 */
export function resolveWorksheet(
  doc: GoogleSpreadsheet,
  sheetTitle: string
): GoogleSpreadsheetWorksheet {
  if (sheetTitle) {
    const sheet = doc.sheetsByTitle[sheetTitle];
    if (!sheet) {
      const available = Object.keys(doc.sheetsByTitle).join(' / ') || '(なし)';
      throw new Error(`シート「${sheetTitle}」が見つかりません。利用可能なシート: ${available}`);
    }
    return sheet;
  }
  const first = doc.sheetsByIndex[0];
  if (!first) {
    throw new Error('スプレッドシートにシートが1つもありません');
  }
  return first;
}
