/*
Copyright 2022-2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only
Please see LICENSE in the repository root for full details.
*/

// This code is taken from the Element Call codebase and a bit over engineered
// for this simple demo.

class ParamParser {
  private fragmentParams: URLSearchParams;
  private queryParams: URLSearchParams;

  public constructor(search: string, hash: string) {
    this.queryParams = new URLSearchParams(search);

    const fragmentQueryStart = hash.indexOf("?");
    this.fragmentParams = new URLSearchParams(
      fragmentQueryStart === -1 ? "" : hash.substring(fragmentQueryStart)
    );
  }

  // Normally, URL params should be encoded in the fragment so as to avoid
  // leaking them to the server. However, we also check the normal query
  // string for backwards compatibility with versions that only used that.
  public getParam(name: string): string | null {
    return this.fragmentParams.get(name) ?? this.queryParams.get(name);
  }

  public getAllParams(name: string): string[] {
    return [
      ...this.fragmentParams.getAll(name),
      ...this.queryParams.getAll(name),
    ];
  }

  public getFlagParam(name: string, defaultValue = false): boolean {
    const param = this.getParam(name);
    return param === null ? defaultValue : param !== "false";
  }
}
export interface UrlParams {
  baseUrl: string | null;
  // Widget api related params
  widgetId: string | null;
  parentUrl: string | null;
  userId: string | null;
  deviceId: string | null;
  roomId: string | null;
}

/**
 * Gets the app parameters for the current URL.
 * @param search The URL search string
 * @param hash The URL hash
 * @returns The app parameters encoded in the URL
 */
export const getUrlParams = (
  search = window.location.search,
  hash = window.location.hash
): UrlParams => {
  const parser = new ParamParser(search, hash);

  const userId = parser.getParam("userId");
  const deviceId = parser.getParam("deviceId");
  const widgetId = parser.getParam("widgetId");
  const parentUrl = parser.getParam("parentUrl");
  const baseUrl = parser.getParam("baseUrl");

  return {
    baseUrl,
    widgetId,
    parentUrl,
    userId,
    deviceId,
    // NB. we don't validate roomId here as we do in getRoomIdentifierFromUrl:
    // what would we do if it were invalid? If the widget API says that's what
    // the room ID is, then that's what it is.
    roomId: parser.getParam("roomId"),
  };
};
