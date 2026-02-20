//
//  PerperalsTableViewController.h
//  RunmefitSDKDemo
//
//  Created by 星迈 on 2021/11/22.
//

#import <UIKit/UIKit.h>

#import "STBleManager.h"
#import "MBProgressHUD.h"

/**
 多国际化:默认的字符串采用的是英语
 */
#define TRLocalizedString(key,empty)  ((![[[NSLocale preferredLanguages] objectAtIndex:0] containsString:@"zh-Hans"]) ? \
                                      ([[NSBundle bundleWithPath:[[NSBundle mainBundle] pathForResource:@"en"ofType:@"lproj"]] localizedStringForKey:key value:@"" table:nil]) : \
                                      (NSLocalizedString(key, nil)))

NS_ASSUME_NONNULL_BEGIN

@interface PerperalsTableViewController : UITableViewController

@end

NS_ASSUME_NONNULL_END
