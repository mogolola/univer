/**
 * Copyright 2023-present DreamNum Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { IPermissionParam } from '@univerjs/core';
import type { UnitObject } from '@univerjs/protocol';
import type { Observable } from 'rxjs';

export interface IWorksheetProtectionRule {
    permissionId: string;
    name: string;
    description?: string;
    unitType: UnitObject;
    unitId: string;
    subUnitId: string;
}

export interface IWorksheetProtectionPointRule {
    unitId: string;
    subUnitId: string;
    permissionId: string;
}

export type IObjectModel = Record<string, IWorksheetProtectionRule[]>;
export type IModel = Map<string, Map<string, IWorksheetProtectionRule>>;

export type IObjectPointModel = Record<string, IWorksheetProtectionPointRule[]>;
export type IPointRuleModel = Map<string, Map<string, IWorksheetProtectionPointRule>>;

export interface IWorkbookPermissionServiceMethods {
    [key: string]: GetWorkbookPermission$ | GetWorkbookPermission | SetWorkbookPermission;
}

export type GetWorkbookPermission$ = (unitId: string) => Observable<boolean>;
export type GetWorkbookPermission = (unitId: string) => boolean;
export type SetWorkbookPermission = (unitId: string, value: boolean) => void;

export interface IWorksheetPermissionServiceMethods {
    [key: string]: GetWorksheetPermission$ | GetWorksheetPermission | SetWorksheetPermission;
}

export type GetWorksheetPermission$ = (permissionParma: IPermissionParam) => Observable<boolean>;
export type GetWorksheetPermission = (permissionParma: IPermissionParam) => boolean;
export type SetWorksheetPermission = (value: boolean, unitId?: string, subUnitId?: string) => void;
