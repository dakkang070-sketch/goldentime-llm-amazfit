//
//  MainTableViewController+Help.h
//  RunmefitSDKDemo
//
//  Created by 星迈 on 2022/11/9.
//

#import "MainTableViewController.h"

#define cell_id @"cell_id"
#define cell_title @"cell_title"

NS_ASSUME_NONNULL_BEGIN

@interface MainTableViewController (Help)

- (NSArray *)readFuncArr;

//星迈天气类型
- (NSString *)stmWeatherCodeTransform:(int)code;

#pragma mark - MBProgressHUD
- (void)showProgress:(float)progress;
- (void)showHUDText:(NSString *)text;
- (void)hideHUD;

#pragma mark - 回调
-(void)nofReviceData:(NSNotification *)noti;

#pragma mark - 下载文件
- (void)requestDownloadWithUrlstring:(NSString *)urlStr;

@end

NS_ASSUME_NONNULL_END
