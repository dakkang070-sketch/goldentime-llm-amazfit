//
//  MainTableViewController+Help.m
//  RunmefitSDKDemo
//
//  Created by 星迈 on 2022/11/9.
//

#import "MainTableViewController+Help.h"

@implementation MainTableViewController (Help)

- (NSArray *)readFuncArr {
    
    NSArray *arr = @[
        @{cell_id:@0, cell_title:TRLocalizedString(@"绑定设备", nil)},
        @{cell_id:@1, cell_title:TRLocalizedString(@"设备状态(获取)", nil)},
        @{cell_id:@2, cell_title:TRLocalizedString(@"设备状态(设置)", nil)},
        @{cell_id:@3, cell_title:TRLocalizedString(@"查找设备", nil)},
        @{cell_id:@4, cell_title:TRLocalizedString(@"拍照控制", nil)},
        @{cell_id:@5, cell_title:TRLocalizedString(@"获取电池电量", nil)},
        @{cell_id:@6, cell_title:TRLocalizedString(@"获取设备版本信息", nil)},
        @{cell_id:@7, cell_title:TRLocalizedString(@"时间时区(获取)", nil)},
        @{cell_id:@8, cell_title:TRLocalizedString(@"时间时区(设置)", nil)},
        @{cell_id:@9, cell_title:TRLocalizedString(@"用户信息(获取)", nil)},
        
        @{cell_id:@10, cell_title:TRLocalizedString(@"用户信息(设置)", nil)},
        @{cell_id:@11, cell_title:TRLocalizedString(@"一天运动目标(获取)", nil)},
        @{cell_id:@12, cell_title:TRLocalizedString(@"一天运动目标(设置)", nil)},
        @{cell_id:@13, cell_title:TRLocalizedString(@"蓝牙系统配对", nil)},
        @{cell_id:@14, cell_title:TRLocalizedString(@"消息推送开关(获取)", nil)},
        @{cell_id:@15, cell_title:TRLocalizedString(@"消息推送开关(设置)", nil)},
        @{cell_id:@16, cell_title:TRLocalizedString(@"获取当前设备展示数据", nil)},
        @{cell_id:@17, cell_title:TRLocalizedString(@"健康数据检测开关(获取)", nil)},
        @{cell_id:@18, cell_title:TRLocalizedString(@"健康数据检测开关(设置)", nil)},
        @{cell_id:@19, cell_title:TRLocalizedString(@"恢复出厂设置", nil)},
        

        @{cell_id:@20, cell_title:TRLocalizedString(@"心率检测间隔(获取)", nil)},
        @{cell_id:@21, cell_title:TRLocalizedString(@"心率检测间隔(设置)", nil)},
        @{cell_id:@22, cell_title:TRLocalizedString(@"常用联系人(获取)", nil)},
        @{cell_id:@23, cell_title:TRLocalizedString(@"常用联系人(设置)", nil)},
        @{cell_id:@24, cell_title:TRLocalizedString(@"紧急联系人(获取)", nil)},
        @{cell_id:@25, cell_title:TRLocalizedString(@"紧急联系人(设置)", nil)},
        @{cell_id:@26, cell_title:TRLocalizedString(@"勿扰(获取)", nil)},
        @{cell_id:@27, cell_title:TRLocalizedString(@"勿扰(设置)", nil)},
        @{cell_id:@28, cell_title:TRLocalizedString(@"闹钟(获取)", nil)},
        @{cell_id:@29, cell_title:TRLocalizedString(@"闹钟(设置)", nil)},
        
        @{cell_id:@30, cell_title:TRLocalizedString(@"久坐提醒(获取)", nil)},
        @{cell_id:@31, cell_title:TRLocalizedString(@"久坐提醒(设置)", nil)},
        @{cell_id:@32, cell_title:TRLocalizedString(@"喝水提醒(获取)", nil)},
        @{cell_id:@33, cell_title:TRLocalizedString(@"喝水提醒(设置)", nil)},
        @{cell_id:@34, cell_title:TRLocalizedString(@"推送天气", nil)},
        @{cell_id:@35, cell_title:TRLocalizedString(@"事件提醒(获取)", nil)},
        @{cell_id:@36, cell_title:TRLocalizedString(@"事件提醒(设置)", nil)},

        
        @{cell_id:@37, cell_title:TRLocalizedString(@"同步运动", nil)},
        @{cell_id:@38, cell_title:TRLocalizedString(@"同步记步/睡眠", nil)},
        @{cell_id:@39, cell_title:TRLocalizedString(@"同步心率", nil)},
        
        @{cell_id:@40, cell_title:TRLocalizedString(@"同步血压", nil)},
        @{cell_id:@41, cell_title:TRLocalizedString(@"同步血氧", nil)},
        @{cell_id:@42, cell_title:TRLocalizedString(@"同步压力", nil)},
        @{cell_id:@43, cell_title:TRLocalizedString(@"同步梅脱", nil)},
        @{cell_id:@44, cell_title:TRLocalizedString(@"同步温度", nil)},
        @{cell_id:@45, cell_title:TRLocalizedString(@"同步Mai", nil)},
        @{cell_id:@46, cell_title:TRLocalizedString(@"获取数据有效日期列表", nil)},
                     
        @{cell_id:@47, cell_title:TRLocalizedString(@"文件传输(表盘)", nil)},
        @{cell_id:@48, cell_title:TRLocalizedString(@"获取表盘信息", nil)},
        @{cell_id:@49, cell_title:TRLocalizedString(@"切换当前显示表盘", nil)},
        
        @{cell_id:@50, cell_title:TRLocalizedString(@"文件传输(UI)", nil)},
        @{cell_id:@51, cell_title:TRLocalizedString(@"文件传输(语言)", nil)},
                     
        @{cell_id:@52, cell_title:TRLocalizedString(@"实时数据开关(获取)", nil)},
        @{cell_id:@53, cell_title:TRLocalizedString(@"实时数据开关(设置)", nil)},
                     
        @{cell_id:@54, cell_title:TRLocalizedString(@"同步血糖", nil)},
        @{cell_id:@55, cell_title:TRLocalizedString(@"运动模式配置(获取)", nil)},
        @{cell_id:@56, cell_title:TRLocalizedString(@"运动模式配置(设置)", nil)},
        @{cell_id:@57, cell_title:TRLocalizedString(@"自定义推送消息(设置)", nil)},
        
        @{cell_id:@58, cell_title:TRLocalizedString(@"网络：表盘列表", nil)},
        @{cell_id:@59, cell_title:TRLocalizedString(@"网络：固件版本信息", nil)},
        @{cell_id:@60, cell_title:TRLocalizedString(@"网络：UI版本信息", nil)},
        @{cell_id:@61, cell_title:TRLocalizedString(@"网络：字库列表", nil)},
        
        @{cell_id:@62, cell_title:TRLocalizedString(@"单独时区(获取)", nil)},
        @{cell_id:@63, cell_title:TRLocalizedString(@"单独时区(设置)", nil)},
        @{cell_id:@64, cell_title:TRLocalizedString(@"世界时钟(获取)", nil)},
        @{cell_id:@65, cell_title:TRLocalizedString(@"世界时钟(设置)", nil)},
        @{cell_id:@66, cell_title:TRLocalizedString(@"推送应用(获取)", nil)},
        @{cell_id:@67, cell_title:TRLocalizedString(@"推送应用(设置)", nil)},
        @{cell_id:@68, cell_title:TRLocalizedString(@"脱腕密码(获取)", nil)},
        @{cell_id:@69, cell_title:TRLocalizedString(@"脱腕密码(设置)", nil)},
        @{cell_id:@70, cell_title:TRLocalizedString(@"女性健康(获取)", nil)},
        @{cell_id:@71, cell_title:TRLocalizedString(@"女性健康(设置)", nil)},
        @{cell_id:@72, cell_title:TRLocalizedString(@"推送天气(7天)", nil)},
        @{cell_id:@73, cell_title:TRLocalizedString(@"健康测量指令", nil)},
        @{cell_id:@74, cell_title:TRLocalizedString(@"同步新睡眠", nil)}
 
    ];
    
    return arr;
}

//星迈天气类型
- (NSString *)stmWeatherCodeTransform:(int)code {
    
    NSString *transformCode = @"24";//未知
    switch (code) {
        case 100:
        case 150:
            transformCode = @"6";//晴
            break;
            
        case 101:
        case 151://多云
        case 102:
        case 152://少云
        case 103:
        case 153://晴间多云
            transformCode = @"5";
            break;
            
        case 104:
        case 154:
            transformCode = @"4";//阴
            break;
            
        case 300:
        case 350://阵雨
        case 301:
        case 351://强阵雨
        case 302://雷阵雨
        case 303://强雷阵雨
            transformCode = @"9";
            break;

        case 304://雷阵雨伴有冰雹
            transformCode = @"10";
            break;
            
        case 309://毛毛雨/细雨
        case 399://雨
        case 305://小雨
            transformCode = @"1";
            break;
            
        case 314://小到中雨
        case 315://中到大雨
        case 306://中雨
            transformCode = @"2";
            break;
            
        case 316://大到暴雨
        case 307://大雨
            transformCode = @"3";
            break;
            
        case 308://极端降雨
        case 310://暴雨
        case 311://大暴雨
        case 312://特大暴雨
        case 313://冻雨
        case 317://暴雨到大暴雨
        case 318://大暴雨到特大暴雨
            transformCode = @"22";
            break;
            
        case 499://雪
        case 400://小雪
            transformCode = @"11";
            break;
                            
        case 401://中雪
        case 407:
        case 457://阵雪
        case 408://小到中雪
            transformCode = @"12";
            break;
            
        case 403://暴雪
        case 409://中到大雪
        case 410://大到暴雪
        case 402://大雪
            transformCode = @"13";
            break;
       
        case 404://雨夹雪
        case 405://雨雪天气
        case 406:
        case 456://阵雨夹雪
            transformCode = @"14";
            break;
        
        case 503:
        case 504://扬沙
        case 507://沙尘暴
        case 508://强沙尘暴
            transformCode = @"15";
            break;
            
        case 500://薄雾
        case 509://浓雾
        case 510://强浓雾
        case 511://中度霾
        case 512://重度霾
        case 513://严重霾
        case 514://大雾
        case 515://特强浓雾
        case 501://雾
        case 502://霾
            transformCode = @"7";
            break;
            
        case 900://热
        case 901://冷
        case 999:
            transformCode = @"24";//未知
            break;
        case 800:
            break;
        case 801:
            break;
        case 802:
            break;
        case 803:
            break;
        case 804:
            break;
        case 805:
            break;
        case 806:
            break;
        case 807:
            break;
        default:
            break;
    }
    return transformCode;
}

#pragma mark - 回调
-(void)nofReviceData:(NSNotification *)noti {
    if (noti) {
        NSDictionary *dict = noti.userInfo;
        NSNumber *revType = dict[ST_RevType_Key];
        NSNumber *errorType = dict[ST_ErrorType_Key];
        NSDictionary *responseObject = noti.object;
        NSLog(@"CMD:0x%02lx",revType.unsignedIntegerValue);
        NSLog(@"ERROR:0x%02lx",errorType.unsignedIntegerValue);
        if (errorType.unsignedIntegerValue != RES_Correct) {
            
            if (revType.unsignedIntegerValue == REV_Bin_File_Info || revType.unsignedIntegerValue == REV_Bin_File || revType.unsignedIntegerValue == REV_Bin_File_Diff) {
                [self showHUDText:@"接收异常"];
            }else{
                //[self addLog:@"接收异常"];
            }
            
            return;
        }
        switch (revType.unsignedIntegerValue) {
            case REV_Device_Bind:
            {
                NSNumber* isBind = [responseObject objectForKey:ST_DeviceBindKey];
                NSString *content = [NSString stringWithFormat:@"绑定授权%@:",(isBind.boolValue==YES)?@"成功":@"失败"];
                [self addLog:content];
            }
                break;
            case REV_Device_State:
            {
                STDeviceState *model = STDeviceState.new;

                NSNumber* timeMode = [responseObject objectForKey:ST_HourSystemKey];
                NSNumber* unit = [responseObject objectForKey:ST_UnitKey];
                NSNumber* temperatureUnit = [responseObject objectForKey:ST_TemperatureUnitKey];
                NSNumber* language = [responseObject objectForKey:ST_LanguageDataKey];
                NSNumber* brightDuration = [responseObject objectForKey:ST_BrightDurationKey];
                NSNumber* brightness = [responseObject objectForKey:ST_BrightnessKey];
                NSNumber* trunWrist = [responseObject objectForKey:ST_TrunWristKey];
                
                model.timeMode = timeMode.unsignedIntegerValue;///时间制式:24小时
                model.unit = unit.unsignedIntegerValue;///单位:公制
                model.temperatureUnit = temperatureUnit.unsignedIntegerValue;///温度单位:摄氏
                model.language = language.unsignedIntegerValue;///语言:中文
                model.brightDuration = brightDuration.unsignedIntegerValue;///亮屏时长:10分钟
                model.brightness = brightness.unsignedIntegerValue;///屏幕亮度:5
                model.trunWrist = trunWrist.unsignedIntegerValue;///翻腕亮屏:开
            }
                break;
            case SET_Device_State:
                break;
            case REV_Device_ANCS:
            {
                NSNumber* find = [responseObject objectForKey:ST_FindDeviceKey];
                if (find.boolValue == YES) {
                    [self showHUDText:@"查看ANCS:连接"];
                }else{
                    [self showHUDText:@"查看ANCS:断开"];
                }
                return;
            }
                break;
            case SET_Device_ANCS:
                break;
            case REV_Device_DZKG:
            {
                NSArray* typeArr = [responseObject objectForKey:ST_FindDeviceKey];
                int type1 = [typeArr[0] intValue];
                int type2 = [typeArr[1] intValue];
                NSString *tips1 = [NSString stringWithFormat:@"蓝牙:%@",type1?@"开":@"关"];
                NSString *tips2 = [NSString stringWithFormat:@"SOS:%@",type2?@"开":@"关"];
                [self showHUDText:[NSString stringWithFormat:@"%@；%@",tips1,tips2]];
                return;
            }
                break;
            case SET_Device_DZKG:
                break;
            case REV_Device_Lost:
            {
                NSNumber* find = [responseObject objectForKey:ST_FindDeviceKey];
                if (find.boolValue == YES) {
                    [self showHUDText:@"查看手机"];
                }
                return;
            }
                break;
            case REV_Device_Camera:
            {
                NSNumber* mode = [responseObject objectForKey:ST_PhotoGraphModeKey];
                
                NSString *content = @"";
                if (mode.unsignedIntegerValue == 1) {
                    content = @"进入拍照界面";
                }
                if (mode.unsignedIntegerValue == 2) {
                    content = @"退出拍照界面";
                }
                if (mode.unsignedIntegerValue == 3) {
                    content = @"app点击拍照";
                }
                [self addLog:content];
                return;
            }
                break;
            case REV_Device_Battery:
            {
                NSNumber* state = [responseObject objectForKey:ST_GetElectricityStateKey];
                NSNumber* battery = [responseObject objectForKey:ST_GetElectricityKey];
                
                [self addLog:[NSString stringWithFormat:@"%@\n电量百分比:%d%%",(state.boolValue == YES)?@"充电中":@"未充电",battery.intValue]];
                return;
            }
                break;
            case REV_Device_Version:
            {
                /**
                NSString *version = [responseObject objectForKey:ST_GetVersionNumberKey];
                NSString *uiVersion = [responseObject objectForKey:ST_GetUIVersionNumberKey];
                NSNumber *deviceMtu = [responseObject objectForKey:ST_GetDeviceMtuKey];
                NSNumber *width = [responseObject objectForKey:ST_GetDeviceWidthKey];
                NSNumber *height = [responseObject objectForKey:ST_GetDeviceHeightKey];
                NSNumber *shape = [responseObject objectForKey:ST_GetDeviceShapeKey];
                NSString *nameModel = [responseObject objectForKey:ST_GetDeviceModelKey];
                NSNumber *forcedUpgrade = [responseObject objectForKey:ST_ForcedUpgradeUIKey];
                */
                NSNumber *deviceMtu = [responseObject objectForKey:ST_GetDeviceMtuKey];
                self.blockReadInterval = deviceMtu.integerValue;
                self.version = [responseObject objectForKey:ST_GetVersionNumberKey];
                self.uiVersion = [responseObject objectForKey:ST_GetUIVersionNumberKey];
                self.nameModel = [responseObject objectForKey:ST_GetDeviceModelKey];
                ///NSString *docVersion = [responseObject objectForKey:ST_GetDocVersionNumberKey];
            }
                break;
            case REV_Time_Era:
                break;
            case SET_Time_Era:
                break;
            case REV_World_Clock:
            {
                NSArray *worldClockArr = [responseObject objectForKey:ST_WorldClockListKey];
                NSLog(@"worldClockArr=%@",worldClockArr);
            }
                break;
            case SET_World_Clock:
                break;
            case REV_Fun_List:
            {
                NSArray *funIdArr = [responseObject objectForKey:ST_FunIdListKey];
                NSLog(@"funIdArr=%@",funIdArr);
            }
                break;
            case SET_Fun_List:
                break;
            case REV_Wrist_Code:
            {
                NSString *codeString = [responseObject objectForKey:ST_WristCodeKey];
                NSLog(@"codeString=%@",codeString);
            }
                break;
            case SET_Wrist_Code:
                break;
            case REV_Women_Health:
                break;
            case SET_Women_Health:
                break;
            case REV_Health_Check:
            {
                //...
            }
                break;
            case REV_Standing_Movement:
            {
                NSString *standingStr = [responseObject objectForKey:ST_GetRecordDateTimeKey];
                NSString *movementStr = [responseObject objectForKey:ST_GetRecordValueDataKey];

                NSString *content = [NSString stringWithFormat:@"%@:%@\n%@:%@",TRLocalizedString(@"站立", nil),standingStr,TRLocalizedString(@"运动", nil),movementStr];
                [self addLog:content];
                return;
            }
                break;
            case REV_Threshold_HR:
            {
                NSNumber *isOn = [responseObject objectForKey:@"isOn"];;
                NSNumber *thresholdHR = [responseObject objectForKey:@"thresholdHR"];;

                NSString *content = [NSString stringWithFormat:@"%@:%@\n%@:%@",TRLocalizedString(@"开关", nil),isOn,TRLocalizedString(@"阀值", nil),thresholdHR];
                [self addLog:content];
                return;
            }
                break;
            case SET_Threshold_HR:
                break;
            case SET_Health_Check:
                break;
            case REV_Health_Measure:
            {
                NSNumber *Id = [responseObject objectForKey:ST_HealthMeasureIdKey];
                NSArray *valueArr = [responseObject objectForKey:ST_HealthMeasureValueKey];
                NSLog(@"Id=%@",Id);
                NSLog(@"valueArr=%@",valueArr);
            }
                break;
            case REV_Update_Time:
            {
                /**
                NSNumber* year = [responseObject objectForKey:ST_YearKey];
                NSNumber* month = [responseObject objectForKey:ST_MonthKey];
                NSNumber* day = [responseObject objectForKey:ST_DayKey];
                NSNumber* hour = [responseObject objectForKey:ST_HourKey];
                NSNumber* minute = [responseObject objectForKey:ST_MinuteKey];
                NSNumber* second = [responseObject objectForKey:ST_SecondKey];
                NSNumber* zone = [responseObject objectForKey:ST_ZoneKey];
                */
            }
                break;
            case SET_Update_Time:
                break;
            case REV_User_Info:
            {
                /**
                NSNumber* gender = [responseObject objectForKey:ST_UserGenderKey];
                NSNumber* age = [responseObject objectForKey:ST_UserAgeKey];
                NSNumber* height = [responseObject objectForKey:ST_UserHeightKey];
                NSNumber* weight = [responseObject objectForKey:ST_UserWeightKey];
                */
            }
                break;
            case SET_User_Info:
                break;
            case REV_Goal_Sport:
            {
                /**
                NSNumber* step = [responseObject objectForKey:ST_TargetStepKey];
                NSNumber* calorie = [responseObject objectForKey:ST_TargetCalorieKey];
                NSNumber* distance = [responseObject objectForKey:ST_TargetDistanceKey];
                */
            }
                break;
            case SET_Goal_Sport:
                break;
            case REV_Device_Pair:
                break;
            case REV_State_Notification:
            {
                /**
                NSNumber* isAll = [responseObject objectForKey:ST_NotiIncominglKey];
                NSNumber* isSms = [responseObject objectForKey:ST_NotiSmsKey];
                NSNumber* isEmail = [responseObject objectForKey:ST_NotiEmailKey];
                NSNumber* isTwitter = [responseObject objectForKey:ST_NotiTwitterKey];
                NSNumber* isFacebook = [responseObject objectForKey:ST_NotiFacebookKey];
                NSNumber* isWhatsapp = [responseObject objectForKey:ST_NotiWhatsappKey];
                NSNumber* isLine = [responseObject objectForKey:ST_NotiLineKey];
                NSNumber* isSkype = [responseObject objectForKey:ST_NotiSkypeKey];
                NSNumber* isQq = [responseObject objectForKey:ST_NotiQqKey];
                NSNumber* isWechat = [responseObject objectForKey:ST_NotiWechatKey];
                NSNumber* isInstagram = [responseObject objectForKey:ST_NotiInstagramKey];
                NSNumber* isLinkedin = [responseObject objectForKey:ST_NotiLinkedinKey];
                NSNumber* isMessager = [responseObject objectForKey:ST_NotiMessagerKey];
                NSNumber* isVk = [responseObject objectForKey:ST_NotiVkKey];
                NSNumber* isViber = [responseObject objectForKey:ST_NotiViberKey];
                NSNumber* isTelegram = [responseObject objectForKey:ST_NotiTelegramKey];
                NSNumber* isKakaoTalk = [responseObject objectForKey:ST_NotiKakaoTalkKey];
                NSNumber* isOther = [responseObject objectForKey:ST_NotiOtherKey];
                */
            }
                break;
            case SET_State_Notification:
                break;
            case REV_Health_Current:
            {
                /**
                NSNumber* step = [responseObject objectForKey:ST_GetCurrentValueStepKey];
                NSNumber* calorie = [responseObject objectForKey:ST_GetCurrentValueCalorieKey];
                NSNumber* distance = [responseObject objectForKey:ST_GetCurrentValueDistanceKey];
                NSNumber* sleep = [responseObject objectForKey:ST_GetCurrentValueSleepKey];
                NSNumber* deep_sleep = [responseObject objectForKey:ST_GetCurrentValueDeepSleepKey];
                NSNumber* light_sleep = [responseObject objectForKey:ST_GetCurrentValueLightSleepKey];
                
                NSNumber* HR =       [responseObject objectForKey:ST_GetCurrentValueHRKey];
                NSNumber* heightBP = [responseObject objectForKey:ST_GetCurrentValueHeightBPKey];
                NSNumber* lowBP =    [responseObject objectForKey:ST_GetCurrentValueLowBPKey];
                NSNumber* BO =       [responseObject objectForKey:ST_GetCurrentValueBOKey];
                NSNumber* HP =       [responseObject objectForKey:ST_GetCurrentValueHPKey];
                NSNumber* MET =      [responseObject objectForKey:ST_GetCurrentValueMETKey];
                NSNumber* temperature = [responseObject objectForKey:ST_GetCurrentValueTemperatureKey];
                NSNumber* sugar = [responseObject objectForKey:ST_GetCurrentValueSugarKey];
                NSNumber* wear = [responseObject objectForKey:ST_GetCurrentStateWearKey];
                */
            }
                break;
            case REV_Health_Switch:
            {
                /**
                NSNumber* isSwitchHR = [responseObject objectForKey:ST_SwitchHRKey];
                NSNumber* isSwitchBP = [responseObject objectForKey:ST_SwitchBPKey];
                NSNumber* isSwitchBO = [responseObject objectForKey:ST_SwitchBOKey];
                NSNumber* isSwitchPP = [responseObject objectForKey:ST_SwitchPPKey];
                NSNumber* isSwitchTP = [responseObject objectForKey:ST_SwitchTPKey];
                NSNumber* isSwitchBS = [responseObject objectForKey:ST_SwitchBSKey];
                */
            }
                break;
            case SET_Health_Switch:
                break;
            case SET_Factory_Setting:
                break;
                
                
            case REV_Interval_HR:
            {
                /**
                NSNumber* startHour = [responseObject objectForKey:ST_StartHourKey];
                NSNumber* startMins = [responseObject objectForKey:ST_StartMinsKey];
                NSNumber* endHour = [responseObject objectForKey:ST_EndHourKey];
                NSNumber* endMins = [responseObject objectForKey:ST_EndMinsKey];
                NSNumber* interval = [responseObject objectForKey:ST_IntervalKey];
                NSNumber* threshold = [responseObject objectForKey:ST_ThresholdKey];
                */
            }
                break;
            case SET_Interval_HR:
                break;
            case REV_Contact_Common:
            case REV_Contact_SOS:
            {
                NSArray *contactsArr = [responseObject objectForKey:ST_ContactsKey];
                for (NSDictionary *dic in contactsArr) {
                    NSString *name = [dic objectForKey:ST_ContactNameKey];
                    NSString *phone = [dic objectForKey:ST_ContactPhoneKey];
                    NSString *content = [NSString stringWithFormat:@"%@:%@\n%@:%@",TRLocalizedString(@"ST_ContactNameKey", nil),name,TRLocalizedString(@"ST_ContactPhoneKey", nil),phone];
                    [self addLog:content];
                }
                return;
            }
                break;
            case SET_Contact_Common:
            case SET_Contact_SOS:
                break;
            case REV_Remind_NoDisturb:
            {
                /**
                NSNumber* isOpen = [responseObject objectForKey:ST_NoDisturbOpenKey];
                NSNumber* isAllDay = [responseObject objectForKey:ST_NoDisturbAllDayKey];
                NSNumber* startHour = [responseObject objectForKey:ST_StartHourKey];
                NSNumber* startMins = [responseObject objectForKey:ST_StartMinsKey];
                NSNumber* endHour = [responseObject objectForKey:ST_EndHourKey];
                NSNumber* endMins = [responseObject objectForKey:ST_EndMinsKey];
                */
            }
                break;
            case SET_Remind_NoDisturb:
                break;
            case REV_Remind_AlarmClock:
            {
                NSArray *clocksArr = [responseObject objectForKey:ST_ClocksKey];
                for (NSDictionary *dic in clocksArr) {
                    NSNumber* hour = [dic objectForKey:ST_ClockHourKey];
                    NSNumber* mins = [dic objectForKey:ST_ClockMinsKey];
                    NSNumber* isOpen = [dic objectForKey:ST_ClockOpenKey];
                    NSNumber* type = [dic objectForKey:ST_ClockTypeKey];
                    NSString *valueStr = [dic objectForKey:ST_ClockCycleKey];
                    [self addLog:@"------------------------------------"];
                    NSString *content = [NSString stringWithFormat:@"%@:%@\n%@:%@\n%@:%@(%@)",
                                         TRLocalizedString(@"ST_ClockTypeKey", nil),type,
                                         TRLocalizedString(@"ST_ClockOpenKey", nil),isOpen,
                                         hour,mins,valueStr];
                    [self addLog:content];
                }
                return;
            }
                break;
            case SET_Remind_AlarmClock:
                break;
            case REV_Remind_Sedentary:
            case REV_Remind_DrinkWater:
            {
                /**
                NSNumber* isOpen =   [responseObject objectForKey:ST_AlarmOpenKey];
                NSNumber* startHour = [responseObject objectForKey:ST_StartHourKey];
                NSNumber* startMins = [responseObject objectForKey:ST_StartMinsKey];
                NSNumber* endHour =   [responseObject objectForKey:ST_EndHourKey];
                NSNumber* endMins =   [responseObject objectForKey:ST_EndMinsKey];
                NSNumber* interval =  [responseObject objectForKey:ST_AlarmIntervalKey];
                */
            }
                break;
            case SET_Remind_Sedentary:
            case SET_Remind_DrinkWater:
                break;
            case SET_Info_Weather:
            case SET_New_Info_Weather:
            case SET_Summer_Time:
                break;
            case REV_Alarm_Even:
            {
                NSArray *evensArr = [responseObject objectForKey:ST_EvensKey];
                for (NSDictionary *dic in evensArr) {
                    
                    NSNumber* year = [dic objectForKey:ST_EvenYearKey];
                    NSNumber* month = [dic objectForKey:ST_EvenMonthKey];
                    NSNumber* day = [dic objectForKey:ST_EvenDayKey];
                    NSNumber* hour = [dic objectForKey:ST_ClockHourKey];
                    NSNumber* mins = [dic objectForKey:ST_ClockMinsKey];
                    
                    NSNumber* type = [dic objectForKey:ST_EvenTypeKey];
                    NSNumber* cycleType = [dic objectForKey:ST_EvenCycleTypeKey];
                    NSString *valueStr = [dic objectForKey:ST_EvenCycleValueKey];
                    
                    NSString *content = [dic objectForKey:ST_EvenContentKey];
                    
                    [self addLog:@"------------------------------------"];
                    NSString *contents = [NSString stringWithFormat:@"%@:%@ \n%@:%@ \n%@:%@ \n%@:%@ \n%@:%@ \n%@:%@ \n%@:%@ \n%@:%@ \n%@:%@",
                                          TRLocalizedString(@"ST_EvenYearKey", nil),year,
                                          TRLocalizedString(@"ST_EvenMonthKey", nil),month,
                                          TRLocalizedString(@"ST_EvenDayKey", nil),day,
                                          TRLocalizedString(@"ST_ClockHourKey", nil),hour,
                                          TRLocalizedString(@"ST_ClockMinsKey", nil),mins,
                                          TRLocalizedString(@"ST_EvenTypeKey", nil),type,
                                          TRLocalizedString(@"ST_EvenCycleTypeKey", nil),cycleType,
                                          TRLocalizedString(@"ST_EvenCycleValueKey", nil),valueStr,
                                          TRLocalizedString(@"ST_EvenContentKey", nil),content];
                    [self addLog:contents];
                }
                return;
            }
                break;
            case SET_Alarm_Even:
                break;
            case REV_Sport_Config:
            {
                NSNumber* walk = [responseObject objectForKey:ST_SportConfigKey_walk];
                NSNumber* run = [responseObject objectForKey:ST_SportConfigKey_run];
                NSNumber* ride = [responseObject objectForKey:ST_SportConfigKey_ride];
                NSNumber* indoorRun = [responseObject objectForKey:ST_SportConfigKey_indoorRun];
                NSNumber* freeTrain = [responseObject objectForKey:ST_SportConfigKey_freeTrain];
                NSNumber* football = [responseObject objectForKey:ST_SportConfigKey_football];
                NSNumber* basketball = [responseObject objectForKey:ST_SportConfigKey_basketball];
                NSNumber* badminton = [responseObject objectForKey:ST_SportConfigKey_badminton];
                NSNumber* ropeSkip = [responseObject objectForKey:ST_SportConfigKey_ropeSkip];
                NSNumber* climb = [responseObject objectForKey:ST_SportConfigKey_climb];
                NSNumber* happyBike = [responseObject objectForKey:ST_SportConfigKey_happyBike];
                NSNumber* yoga = [responseObject objectForKey:ST_SportConfigKey_yoga];
                NSNumber* onFoot = [responseObject objectForKey:ST_SportConfigKey_onFoot];
                NSNumber* fastWalking = [responseObject objectForKey:ST_SportConfigKey_fastWalking];
                NSNumber* ellipticalMachine = [responseObject objectForKey:ST_SportConfigKey_ellipticalMachine];
                NSNumber* strengthTraining = [responseObject objectForKey:ST_SportConfigKey_strengthTraining];

                STSportConfig *sportConfig = [STSportConfig new];
                
                sportConfig.walk = walk.boolValue;
                sportConfig.run = run.boolValue;
                sportConfig.ride = ride.boolValue;
                sportConfig.indoorRun = indoorRun.boolValue;
                sportConfig.freeTrain = freeTrain.boolValue;
                sportConfig.football = football.boolValue;
                sportConfig.basketball = basketball.boolValue;
                sportConfig.badminton = badminton.boolValue;
                sportConfig.ropeSkip = ropeSkip.boolValue;
                sportConfig.climb = climb.boolValue;
                sportConfig.happyBike = happyBike.boolValue;
                sportConfig.yoga = yoga.boolValue;
                sportConfig.onFoot = onFoot.boolValue;
                sportConfig.fastWalking = fastWalking.boolValue;
                sportConfig.ellipticalMachine = ellipticalMachine.boolValue;
                sportConfig.strengthTraining = strengthTraining.boolValue;
            }
                break;
            case SET_Sport_Config:
                break;
                
                
            case REV_History_Sport:
            {
                /**
                NSNumber* year =   [responseObject objectForKey:ST_YearKey];
                NSNumber* month =  [responseObject objectForKey:ST_MonthKey];
                NSNumber* day =    [responseObject objectForKey:ST_DayKey];
                NSNumber* hour =   [responseObject objectForKey:ST_HourKey];
                NSNumber* minute = [responseObject objectForKey:ST_MinuteKey];
                NSNumber* second = [responseObject objectForKey:ST_SecondKey];
                
                NSNumber* duration =  [responseObject objectForKey:ST_GetSportRecordDurationKey];
                NSNumber* type =  [responseObject objectForKey:ST_GetSportRecordTypeKey];
                NSNumber* step =  [responseObject objectForKey:ST_GetSportRecordStepKey];
                NSNumber* distance =  [responseObject objectForKey:ST_GetSportRecordDistanceKey];
                NSNumber* speed = [responseObject objectForKey:ST_GetSportRecordSpeedKey];
                NSNumber* calorie =  [responseObject objectForKey:ST_GetSportRecordCaloriesKey];
                NSNumber* pace =[responseObject objectForKey:ST_GetSportRecordPaceKey];
                NSNumber* stride = [responseObject objectForKey:ST_GetSportRecordStrideKey];
                NSNumber* HRLength = [responseObject objectForKey:ST_GetSportRecordHRLengthKey];
                NSString *valueStr = [responseObject objectForKey:ST_GetSportRecordHRDetailsKey];
                */
            }
                break;
            case REV_History_Step:
            {
                NSString *dateStr = [responseObject objectForKey:ST_GetRecordDateTimeKey];
                NSNumber* interval = [responseObject objectForKey:ST_GetRecordIntervalKey];
                [self addLog:[NSString stringWithFormat:@"%@:%@\n%@:%@",
                              TRLocalizedString(@"ST_GetRecordDateTimeKey", nil),dateStr,
                              TRLocalizedString(@"ST_GetRecordIntervalKey", nil),interval]];
                
                NSMutableString *mStr = [[NSMutableString alloc]initWithString:@"------------------------------------\n"];
                NSArray *stepsArr = [responseObject objectForKey:ST_GetRecordValueDataKey];
                int i = 0;
                for (NSDictionary *dic in stepsArr) {
                    i++;
                    NSNumber* type = [dic objectForKey:ST_GetRecordTypeStepOrSleepKey];
                    NSNumber* step = [dic objectForKey:ST_GetRecordValueStepKey];
                    NSNumber* calorie = [dic objectForKey:ST_GetRecordValueCalorieKey];
                    NSNumber* distance = [dic objectForKey:ST_GetRecordValueDistanceKey];
                    NSNumber* sleep = [dic objectForKey:ST_GetRecordValueSleepKey];
                    /**
                    NSString *content = [NSString stringWithFormat:@"%@:%@\n%@:%@\n%@:%@\n%@:%@\n%@:%@",
                                         TRLocalizedString(@"ST_GetRecordTypeStepOrSleepKey", nil),type,
                                         TRLocalizedString(@"ST_GetRecordValueStepKey", nil),step,
                                         TRLocalizedString(@"ST_GetRecordValueCalorieKey", nil),calorie,
                                         TRLocalizedString(@"ST_GetRecordValueDistanceKey", nil),distance,
                                         TRLocalizedString(@"ST_GetRecordValueSleepKey", nil),sleep];
                    */
                    NSString *content = [NSString stringWithFormat:@"%d-%@:%@;%@:%@;%@:%@;%@:%@;%@:%@\n",i,
                                         TRLocalizedString(@"类型", nil),type,
                                         TRLocalizedString(@"步数", nil),step,
                                         TRLocalizedString(@"卡路里", nil),calorie,
                                         TRLocalizedString(@"距离", nil),distance,
                                         TRLocalizedString(@"睡眠", nil),sleep];
                    [mStr appendString:content];
                }
                [self addLog:mStr];
                return;
            }
                break;
            case REV_History_NewSleep:
            case REV_History_HR:
            case REV_History_BP:
            case REV_History_BQ:
            case REV_History_Pressure:
            case REV_History_Met:
            case REV_History_Temp:
            case REV_History_Mai:
            case REV_History_Sugar:
            case REV_History_Gap:
            {
                /**
                NSString *dateStr = [responseObject objectForKey:ST_GetRecordDateTimeKey];
                NSNumber* interval = [responseObject objectForKey:ST_GetRecordIntervalKey];
                NSString *valueStr = [responseObject objectForKey:ST_GetRecordValueDataKey];
                NSArray *valueArr = [valueStr componentsSeparatedByString:@" "];
                */
                NSString *dateStr = [responseObject objectForKey:ST_GetRecordDateTimeKey];
                NSNumber* interval = [responseObject objectForKey:ST_GetRecordIntervalKey];
                [self addLog:[NSString stringWithFormat:@"%@:%@\n%@:%@",
                              TRLocalizedString(@"ST_GetRecordDateTimeKey", nil),dateStr,
                              TRLocalizedString(@"ST_GetRecordIntervalKey", nil),interval]];
                NSString *valueStr = [responseObject objectForKey:ST_GetRecordValueDataKey];
                NSString *content = [NSString stringWithFormat:@"------------------------------------\n\
                                    %@:\n%@",TRLocalizedString(@"ST_GetRecordValueDataKey", nil),valueStr];
                [self addLog:content];
                if (revType.unsignedIntegerValue == REV_History_NewSleep) {
                    NSArray *valueArr = [valueStr componentsSeparatedByString:@" "];
                    for (NSString *tempStr in valueArr) {
                        //获取历史数据睡眠(1 开始入睡 2 浅睡 3 深睡 4 清醒)
                        //int value = tempStr.intValue;
                        NSLog(@"tempStr=%@",tempStr);
                    }
                }
                return;
            }
                break;
            case REV_History_ValidDate:
            {
                NSArray *dateArr = [responseObject objectForKey:ST_GetRecordValidDateKey];
                for (NSDictionary *dic in dateArr) {
                    NSNumber* year =   [dic objectForKey:ST_YearKey];
                    NSNumber* month =  [dic objectForKey:ST_MonthKey];
                    NSNumber* day =    [dic objectForKey:ST_DayKey];
                    
                    NSString *content = [NSString stringWithFormat:@"%@-%@-%@",year,month,day];
                    [self addLog:content];
                }
                return;
            }
                break;

                
            case REV_Dial_Info:
            {
                NSArray *dateArr = [responseObject objectForKey:ST_GetDialInfoKey];
                for (NSDictionary *dic in dateArr) {
                    NSNumber* isUsed = [dic objectForKey:ST_GetDialUsedKey];
                    NSNumber* Id = [dic objectForKey:ST_GetDialIdKey];
                    NSNumber* RGB565pixel = [dic objectForKey:ST_GetDialRGBKey];
                    NSNumber* mode = [dic objectForKey:ST_GetDialModeKey];
                    [self addLog:@"------------------------------------"];
                    NSString *content = [NSString stringWithFormat:@"%@:%@ \n%@:%@ \n%@:%@ \n%@:%@",
                                         TRLocalizedString(@"ST_GetDialUsedKey", nil),isUsed,
                                         TRLocalizedString(@"ST_GetDialIdKey", nil),Id,
                                         TRLocalizedString(@"ST_GetDialRGBKey", nil),RGB565pixel,
                                         TRLocalizedString(@"ST_GetDialModeKey", nil),mode];
                    [self addLog:content];
                }
                return;
            }
                break;
            case SET_Dial_Current:
                break;

            default:
                break;
        }
        if (responseObject) {
            for (NSString *key in responseObject.allKeys) {
                NSString *content = [NSString stringWithFormat:@"%@:%@",TRLocalizedString(key, nil),responseObject[key]];
                [self addLog:content];
            }
        }
    }
}

#pragma mark - MBProgressHUD
- (void)showProgress:(float)progress {
    if (!self.progressHUD) {
        self.progressHUD = [[MBProgressHUD alloc]initWithView:self.view];
        [self.view addSubview:self.progressHUD];
        self.progressHUD.removeFromSuperViewOnHide = YES;///隐藏时候从父控件中移除
    }
    
    self.progressHUD.bezelView.blurEffectStyle = UIBlurEffectStyleDark;
    self.progressHUD.contentColor = UIColor.whiteColor;///设置颜色
    
    self.progressHUD.mode = MBProgressHUDModeAnnularDeterminate;
    self.progressHUD.label.text = [NSString stringWithFormat:@"加载:%.0f%%",progress*100];///设置进度框中的提示文字
    
    [self.progressHUD showAnimated:YES];///显示进度框
    self.progressHUD.progress = progress;
}

- (void)showHUDText:(NSString *)text {
    if (!self.progressHUD) {
        self.progressHUD = [[MBProgressHUD alloc]initWithView:self.view];
        [self.view addSubview:self.progressHUD];
        self.progressHUD.removeFromSuperViewOnHide = YES;///隐藏时候从父控件中移除
    }
    
    self.progressHUD.bezelView.blurEffectStyle = UIBlurEffectStyleDark;
    self.progressHUD.contentColor = UIColor.whiteColor;///设置颜色
    
    self.progressHUD.mode = MBProgressHUDModeText;
    self.progressHUD.label.text = text;
    
    [self.progressHUD showAnimated:YES];///显示进度框
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 1.2 * NSEC_PER_SEC), dispatch_get_main_queue(), ^(void){
        [self hideHUD];
    });
}

- (void)hideHUD {
    if (self.progressHUD) {
        [self.progressHUD hideAnimated:YES];
        self.progressHUD = nil;
    }
}


//根据文件名拼接文件路径
- (NSString*)getFilePathWithName:(NSString*)name {
    if(name) {
        NSArray *paths = NSSearchPathForDirectoriesInDomains(NSCachesDirectory,NSUserDomainMask, YES);
        NSString *filePath = [[paths objectAtIndex:0] stringByAppendingPathComponent:name];
        return filePath;
    }
    return nil;
}

@end
