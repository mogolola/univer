import {
    DOCS_COMPONENT_MAIN_LAYER_INDEX,
    DocSkeletonManagerService,
    IRichTextEditingMutationParams,
    NORMAL_TEXT_SELECTION_PLUGIN_NAME,
    RichTextEditingMutation,
    TextSelectionManagerService,
    VIEWPORT_KEY,
} from '@univerjs/base-docs';
import {
    DeviceInputEventType,
    DOCS_FORMULA_BAR_EDITOR_UNIT_ID_KEY,
    DOCS_NORMAL_EDITOR_UNIT_ID_KEY,
    DocumentSkeleton,
    IDocumentLayoutObject,
    IEditorInputConfig,
    IRenderManagerService,
    ITextSelectionRenderManager,
    Rect,
    Scene,
    ScrollBar,
} from '@univerjs/base-render';
import {
    Disposable,
    DocumentModel,
    FOCUSING_EDITOR,
    HorizontalAlign,
    ICommandInfo,
    ICommandService,
    IContextService,
    IDocumentBody,
    IDocumentData,
    IPosition,
    ITextRotation,
    IUniverInstanceService,
    LifecycleStages,
    LocaleService,
    Nullable,
    OnLifecycle,
    Tools,
    VerticalAlign,
    WrapStrategy,
} from '@univerjs/core';
import { Inject } from '@wendellhu/redi';
import { Subscription } from 'rxjs';

import { getEditorObject } from '../../Basics/editor/get-editor-object';
import { SetCellEditOperation } from '../../commands/operations/cell-edit.operation';
import { ICellEditorManagerService } from '../../services/editor/cell-editor-manager.service';
import { IEditorBridgeService } from '../../services/editor-bridge.service';
import styles from '../../View/SheetContainer/index.module.less';

const HIDDEN_EDITOR_POSITION = -1000;

const EDITOR_INPUT_SELF_EXTEND_GAP = 5;

const EDITOR_BORDER_SIZE = 2;

interface ICanvasOffset {
    left: number;
    top: number;
}

@OnLifecycle(LifecycleStages.Steady, StartEditController)
export class StartEditController extends Disposable {
    private _onInputSubscription: Nullable<Subscription>;

    private _editorVisiblePrevious = false;

    constructor(
        @Inject(DocSkeletonManagerService) private readonly _docSkeletonManagerService: DocSkeletonManagerService,
        @IContextService private readonly _contextService: IContextService,
        @IUniverInstanceService private readonly _currentUniverService: IUniverInstanceService,
        @IRenderManagerService private readonly _renderManagerService: IRenderManagerService,
        @IEditorBridgeService private readonly _editorBridgeService: IEditorBridgeService,
        @ICellEditorManagerService private readonly _cellEditorManagerService: ICellEditorManagerService,
        @ITextSelectionRenderManager private readonly _textSelectionRenderManager: ITextSelectionRenderManager,
        @Inject(TextSelectionManagerService) private readonly _textSelectionManagerService: TextSelectionManagerService,
        @ICommandService private readonly _commandService: ICommandService,
        @Inject(LocaleService) protected readonly _localService: LocaleService
    ) {
        super();

        this._initialize();

        this._commandExecutedListener();
    }

    override dispose(): void {
        this._onInputSubscription?.unsubscribe();
    }

    private _initialize() {
        this._initialEditFocusListener();
        this._initialStartEdit();
        this._initialKeyboardListener();
        this._initialCursorSync();
    }

    private _initialCursorSync() {
        this._cellEditorManagerService.focus$.subscribe(() => {
            this._textSelectionRenderManager.sync();
        });
    }

    private _initialEditFocusListener() {
        this._editorBridgeService.state$.subscribe((param) => {
            if (param == null) {
                return;
            }

            const { position, documentLayoutObject } = param;

            const editorObject = this._getEditorObject();

            if (editorObject == null) {
                return;
            }

            const { document: documentComponent, scene } = editorObject;

            const { startX, endX } = position;

            const { textRotation, wrapStrategy, documentModel } = documentLayoutObject;

            const { a: angle } = textRotation as ITextRotation;

            documentModel!.updateDocumentId(DOCS_NORMAL_EDITOR_UNIT_ID_KEY);

            // documentModel!.updateDocumentDataMargin(paddingData);

            if (wrapStrategy === WrapStrategy.WRAP && angle === 0) {
                documentModel!.updateDocumentDataPageSize(endX - startX);
            }

            this._currentUniverService.changeDoc(DOCS_NORMAL_EDITOR_UNIT_ID_KEY, documentModel! as DocumentModel);

            const docParam = this._docSkeletonManagerService.updateCurrent({ unitId: DOCS_NORMAL_EDITOR_UNIT_ID_KEY });

            if (docParam == null) {
                return;
            }

            const documentSkeleton = docParam.skeleton;

            documentComponent.changeSkeleton(documentSkeleton);

            this._textSelectionManagerService.setCurrentSelectionNotRefresh({
                pluginName: NORMAL_TEXT_SELECTION_PLUGIN_NAME,
                unitId: docParam.unitId,
            });

            this._textSelectionRenderManager.changeRuntime(documentSkeleton, scene);

            this._textSelectionManagerService.replace([
                {
                    cursorStart: 0,
                    cursorEnd: 0,
                    isCollapse: true,
                    isEndBack: true,
                    isStartBack: true,
                },
            ]);
            this._textSelectionRenderManager.activate(HIDDEN_EDITOR_POSITION, HIDDEN_EDITOR_POSITION);
        });
    }

    private _predictingSize(
        actualRangeWithCoord: IPosition,
        canvasOffset: ICanvasOffset,
        documentSkeleton: DocumentSkeleton,
        documentLayoutObject: IDocumentLayoutObject
    ) {
        const { startX, endX } = actualRangeWithCoord;

        const { textRotation, wrapStrategy } = documentLayoutObject;

        const { a: angle } = textRotation as ITextRotation;

        const clientWidth = document.body.clientWidth;

        if (wrapStrategy === WrapStrategy.WRAP && angle === 0) {
            return documentSkeleton.getActualSize();
        }
        documentSkeleton.getModel().updateDocumentDataPageSize(clientWidth - startX - canvasOffset.left);
        documentSkeleton.calculate();

        const size = documentSkeleton.getActualSize();

        let editorWidth = endX - startX;

        if (editorWidth < size.actualWidth + EDITOR_INPUT_SELF_EXTEND_GAP) {
            editorWidth = size.actualWidth + EDITOR_INPUT_SELF_EXTEND_GAP;
        }

        documentSkeleton.getModel()!.updateDocumentDataPageSize(editorWidth);

        documentSkeleton.getModel()!.updateDocumentRenderConfig({
            horizontalAlign: HorizontalAlign.UNSPECIFIED,
        });

        return {
            actualWidth: editorWidth,
            actualHeight: size.actualHeight,
        };
    }

    private _fitTextSize(
        actualRangeWithCoord: IPosition,
        canvasOffset: ICanvasOffset,
        documentSkeleton: DocumentSkeleton,
        documentLayoutObject: IDocumentLayoutObject
    ) {
        const { startX, startY, endX, endY } = actualRangeWithCoord;
        const { actualWidth, actualHeight } = this._predictingSize(
            actualRangeWithCoord,
            canvasOffset,
            documentSkeleton,
            documentLayoutObject
        );
        const { verticalAlign, paddingData, fill } = documentLayoutObject;

        let editorWidth = endX - startX;

        let editorHeight = endY - startY;

        if (editorWidth < actualWidth) {
            editorWidth = actualWidth;
        }

        if (editorHeight < actualHeight) {
            editorHeight = actualHeight;
            // To restore the page margins for the skeleton.
            documentSkeleton.getModel().updateDocumentDataMargin(paddingData);
        } else {
            // Set the top margin under vertical alignment.
            let offsetTop = paddingData.t || 0;
            if (verticalAlign === VerticalAlign.MIDDLE) {
                offsetTop = (editorHeight - actualHeight) / 2;
            } else if (verticalAlign === VerticalAlign.BOTTOM) {
                offsetTop = editorHeight - actualHeight;
            }

            offsetTop = offsetTop < (paddingData.t || 0) ? paddingData.t || 0 : offsetTop;

            documentSkeleton.getModel().updateDocumentDataMargin({
                t: offsetTop,
            });
        }

        // re-calculate skeleton(viewModel for component)
        documentSkeleton.calculate();

        this._editAreaProcessing(editorWidth, editorHeight, actualRangeWithCoord, canvasOffset, fill);

        // this._textSelectionRenderManager.sync();
    }

    private _editAreaProcessing(
        editorWidth: number,
        editorHeight: number,
        actualRangeWithCoord: IPosition,
        canvasOffset: ICanvasOffset,
        fill: Nullable<string>
    ) {
        const editorObject = this._getEditorObject();

        if (editorObject == null) {
            return;
        }

        const { startX, startY } = actualRangeWithCoord;

        const { document: documentComponent, scene, engine } = editorObject;

        const viewportMain = scene.getViewport(VIEWPORT_KEY.VIEW_MAIN);

        const scrollBar = viewportMain?.getScrollBar() as Nullable<ScrollBar>;

        const clientHeight =
            document.body.clientHeight -
            startY -
            parseFloat(styles.sheetFooterBarHeight) -
            canvasOffset.top -
            EDITOR_BORDER_SIZE * 2;

        const clientWidth = document.body.clientWidth - startX - canvasOffset.left;

        editorWidth += scrollBar?.barSize || 0;

        if (editorWidth > clientWidth) {
            editorWidth = clientWidth;
        }

        let physicHeight = editorHeight;

        scene.transformByState({
            width: editorWidth,
            height: editorHeight,
        });

        documentComponent.resize(editorWidth, editorHeight);

        if (physicHeight > clientHeight) {
            physicHeight = clientHeight;
            if (scrollBar == null) {
                viewportMain && new ScrollBar(viewportMain, { enableHorizontal: false });
            } else {
                viewportMain?.resetSizeAndScrollBar();
            }
        } else {
            viewportMain?.getScrollBar()?.dispose();
        }

        this._addBackground(scene, editorWidth, editorHeight, fill);

        // resize canvas
        engine.resizeBySize(editorWidth, physicHeight);

        this._cellEditorManagerService.setState({
            startX,
            startY,
            endX: editorWidth + startX,
            endY: physicHeight + startY,
            show: true,
        });
    }

    private _addBackground(scene: Scene, editorWidth: number, editorHeight: number, fill?: Nullable<string>) {
        const fillRectKey = '_backgroundRectHelperColor_';
        const rect = scene.getObject(fillRectKey) as Rect;
        if (rect == null && fill == null) {
            return;
        }

        if (rect == null) {
            scene.addObjects(
                [
                    new Rect(fillRectKey, {
                        width: editorWidth,
                        height: editorHeight,
                        fill,
                        evented: false,
                    }),
                ],
                DOCS_COMPONENT_MAIN_LAYER_INDEX
            );
        } else if (fill == null) {
            rect.dispose();
        } else {
            rect.setProps({
                fill,
            });
            rect.transformByState({
                width: editorWidth,
                height: editorHeight,
            });
        }
    }

    private _initialStartEdit() {
        this._editorBridgeService.visible$.subscribe((param) => {
            const { visible, eventType } = param;

            if (visible === this._editorVisiblePrevious) {
                return;
            }

            this._editorVisiblePrevious = visible;

            if (visible === false) {
                return;
            }

            const state = this._editorBridgeService.getState();
            if (state == null) {
                return;
            }

            const { position, documentLayoutObject, canvasOffset } = state;

            const editorObject = this._getEditorObject();

            if (editorObject == null) {
                return;
            }

            const { document, scene } = editorObject;

            this._contextService.setContextValue(FOCUSING_EDITOR, true);

            const docParam = this._docSkeletonManagerService.getCurrent();

            if (docParam == null) {
                return;
            }

            const { skeleton } = docParam;

            const documentModel = skeleton.getModel() as DocumentModel;

            this._fitTextSize(position, canvasOffset, skeleton, documentLayoutObject);

            // move selection
            if (eventType === DeviceInputEventType.Keyboard) {
                const snapshot = Tools.deepClone(documentModel.snapshot) as IDocumentData;
                this._resetBodyStyle(snapshot.body!);

                documentModel.reset(snapshot);

                document.makeDirty();

                // skeleton.calculate();
                this._textSelectionManagerService.replace([
                    {
                        cursorStart: 0,
                        cursorEnd: 0,
                        isCollapse: true,
                        isEndBack: true,
                        isStartBack: true,
                    },
                ]);
            } else {
                const cursor = documentModel.getBodyModel().getLastIndex() - 1 || 0;

                scene.getViewport(VIEWPORT_KEY.VIEW_MAIN)?.scrollTo({
                    y: Infinity,
                });

                this._textSelectionManagerService.replace([
                    {
                        cursorStart: cursor,
                        cursorEnd: cursor,
                        isCollapse: true,
                        isEndBack: true,
                        isStartBack: true,
                    },
                ]);
            }
        });
    }

    private _resetBodyStyle(body: IDocumentBody) {
        body.dataStream = `\r\n`;

        if (body.textRuns != null) {
            if (body.textRuns.length === 1) {
                body.textRuns[0].st = 0;
                body.textRuns[0].ed = 1;
            } else {
                body.textRuns = undefined;
            }
        }

        if (body.paragraphs != null) {
            if (body.paragraphs.length === 1) {
                body.paragraphs[0].startIndex = 0;
            } else {
                body.paragraphs = [
                    {
                        startIndex: 0,
                    },
                ];
            }
        }

        if (body.sectionBreaks != null) {
            body.sectionBreaks = undefined;
        }

        if (body.tables != null) {
            body.tables = undefined;
        }

        if (body.customRanges != null) {
            body.customRanges = undefined;
        }

        if (body.customBlocks != null) {
            body.customBlocks = undefined;
        }
    }

    private _initialKeyboardListener() {
        this._textSelectionRenderManager.onInputBefore$.subscribe(this._showEditorByKeyboard.bind(this));
    }

    private _showEditorByKeyboard(config: Nullable<IEditorInputConfig>) {
        if (config == null) {
            return;
        }
        // const { event, content, activeRange, selectionList } = config;

        // this._editorBridgeService.show(DeviceInputEventType.Keyboard);

        this._commandService.executeCommand(SetCellEditOperation.id, {
            visible: true,
            eventType: DeviceInputEventType.Keyboard,
        });
    }

    private _commandExecutedListener() {
        const updateCommandList = [RichTextEditingMutation.id];

        const excludeUnitList = [DOCS_NORMAL_EDITOR_UNIT_ID_KEY];

        this.disposeWithMe(
            this._commandService.onCommandExecuted((command: ICommandInfo) => {
                if (updateCommandList.includes(command.id)) {
                    const params = command.params as IRichTextEditingMutationParams;
                    const { unitId: commandUnitId } = params;

                    const docsSkeletonObject = this._docSkeletonManagerService.getCurrent();

                    if (docsSkeletonObject == null) {
                        return;
                    }

                    const { unitId, skeleton } = docsSkeletonObject;

                    if (commandUnitId !== unitId) {
                        return;
                    }

                    const currentRender = this._renderManagerService.getRenderById(unitId);

                    if (currentRender == null) {
                        return;
                    }

                    if (!excludeUnitList.includes(unitId)) {
                        return;
                    }

                    const param = this._editorBridgeService.getState();
                    if (param == null) {
                        return;
                    }

                    const { position, documentLayoutObject, canvasOffset } = param;

                    this._fitTextSize(position, canvasOffset, skeleton, documentLayoutObject);

                    // const editorObject = this._getEditorObject();

                    // editorObject?.document.makeDirty();
                }
            })
        );
    }

    private _getEditorObject() {
        return getEditorObject(DOCS_NORMAL_EDITOR_UNIT_ID_KEY, this._renderManagerService);
    }

    private _getFormulaBarEditorObject() {
        return getEditorObject(DOCS_FORMULA_BAR_EDITOR_UNIT_ID_KEY, this._renderManagerService);
    }
}