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

import { Plugin, UniverInstanceType } from '@univerjs/core';
import type { Dependency } from '@wendellhu/redi';
import { Inject, Injector } from '@wendellhu/redi';
import { PLUGIN_NAME } from './common/const';
import type { IDocThreadCommentUIConfig } from './controllers/doc-thread-comment-ui.controller';
import { DocThreadCommentUIController } from './controllers/doc-thread-comment-ui.controller';
import { DocThreadCommentPanelService } from './services/doc-thread-comment-panel.service';

export class UniverDocsCommentUIPlugin extends Plugin {
    static override pluginName = PLUGIN_NAME;
    static override type = UniverInstanceType.UNIVER_DOC;

    constructor(
        private _config: IDocThreadCommentUIConfig = { menu: {} },
        @Inject(Injector) protected _injector: Injector
    ) {
        super();
    }

    override onStarting(injector: Injector): void {
        ([
            [
                DocThreadCommentUIController,
                {
                    useFactory: () => this._injector.createInstance(DocThreadCommentUIController, this._config),
                },
            ],
            [DocThreadCommentPanelService],
        ] as Dependency[]).forEach((dep) => {
            injector.add(dep);
        });
    }
}
